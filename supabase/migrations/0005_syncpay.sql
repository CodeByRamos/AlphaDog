-- AlphaDog — camada de pagamentos da SyncPay.
--
-- Três coisas que este arquivo garante, e cada uma existe por um motivo caro:
--
-- 1. HISTÓRICO. `subscriptions` guarda o estado ATUAL; ela é sobrescrita a cada
--    renovação. Sem uma tabela de pagamentos, "quanto esse cliente já pagou" e
--    "quando caiu cada PIX" viram perguntas sem resposta — inclusive numa
--    contestação, onde a resposta é a defesa.
--
-- 2. IDEMPOTÊNCIA. Gateway reenvia postback. A SyncPay chama com tempo limite de
--    5 segundos: uma resposta lenta nossa vira reenvio dela, com o mesmo
--    pagamento. Se cada chegada estendesse o acesso, uma tentativa repetida
--    daria meses de graça. A trava está na transição de estado, não numa
--    verificação em memória.
--
-- 3. AUDITORIA. Todo postback é gravado como chegou, aprovado ou recusado. É o
--    que permite investigar depois sem depender de log de aplicação, que rotaciona.

-- ------------------------------------------------------------ estados novos

-- O enum existente cobria o ciclo do cartão recorrente. PIX avulso traz três
-- situações que não estavam previstas.
alter type subscription_status add value if not exists 'processing';
alter type subscription_status add value if not exists 'refunded';
alter type subscription_status add value if not exists 'failed';

-- Estado do PAGAMENTO, que não é o mesmo da assinatura: um PIX pode falhar sem
-- derrubar o acesso, se o período anterior ainda vale.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum (
      'pending',
      'processing',
      'paid',
      'failed',
      'canceled',
      'refunded',
      'chargeback'
    );
  end if;
end $$;

-- ------------------------------------------------------------ pagamentos

create table if not exists public.payments (
  -- Gerado por nós ANTES de chamar a SyncPay, e enviado como `externaRef`.
  -- É por ele que o postback volta sabendo de qual cobrança se trata, sem
  -- depender de casar por e-mail ou valor — que colidem.
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null,
  amount_cents integer not null check (amount_cents > 0),
  method text not null default 'pix',
  status payment_status not null default 'pending',
  gateway text not null default 'syncpay',
  -- Identificadores do lado da SyncPay.
  transaction_id text,
  end_to_end text,
  -- O status cru que o gateway mandou, guardado sem tradução: quando aparecer um
  -- estado que o código não conhece, é aqui que ele fica visível.
  raw_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status);
-- Parcial: só linhas com transação preenchida entram, e nelas o id é único.
-- Impede que dois pagamentos nossos apontem para a mesma cobrança da SyncPay.
create unique index if not exists payments_transaction_idx
  on public.payments (transaction_id)
  where transaction_id is not null;

alter table public.payments enable row level security;

-- O tutor lê o próprio histórico. Escrita, nenhuma: quem grava é o webhook, com
-- service_role, que ignora RLS. Sem isso o cliente marcaria o próprio PIX como
-- pago pelo app.
drop policy if exists "payments: dono lê" on public.payments;
create policy "payments: dono lê"
  on public.payments for select
  using (auth.uid() = user_id);

-- ------------------------------------------------------------ auditoria

create table if not exists public.payment_events (
  id bigserial primary key,
  received_at timestamptz not null default now(),
  gateway text not null default 'syncpay',
  transaction_id text,
  reference text,
  raw_status text,
  -- Corpo como chegou. `jsonb` para dar para consultar depois sem reprocessar.
  payload jsonb not null,
  -- O segredo do postback conferiu? Tentativa recusada também é registrada:
  -- uma sequência delas é sinal de que a URL vazou.
  authenticated boolean not null default false,
  -- O que o processamento fez: applied, duplicate, unknown_reference, rejected.
  outcome text not null
);

create index if not exists payment_events_tx_idx on public.payment_events (transaction_id);
create index if not exists payment_events_time_idx on public.payment_events (received_at desc);

-- Ninguém lê auditoria pelo cliente. Sem policy de select, o RLS bloqueia todo
-- acesso via anon key; só a service_role enxerga.
alter table public.payment_events enable row level security;

-- ------------------------------------------------------------ assinatura

alter table public.subscriptions
  add column if not exists gateway text not null default 'syncpay',
  add column if not exists last_payment_id uuid references public.payments (id),
  add column if not exists last_amount_cents integer,
  -- Quando cobrar de novo. Com PIX avulso não há débito automático: esta data
  -- é o que permite avisar o tutor antes de o acesso cair.
  add column if not exists next_charge_at timestamptz;

-- ------------------------------------------------------------ ativação

-- Aplica um pagamento confirmado à assinatura, de forma idempotente.
--
-- A idempotência vive na PRIMEIRA instrução: o update só altera a linha se ela
-- ainda não estiver paga. Se o postback repetir — e ele repete —, nenhuma linha
-- é afetada, a função devolve false e o período NÃO é estendido de novo.
-- Fazer essa verificação na aplicação não serviria: dois postbacks simultâneos
-- passariam os dois pelo `if`. Aqui a checagem e a escrita são a mesma operação.
create or replace function public.apply_paid_payment(
  p_payment_id uuid,
  p_days integer,
  p_transaction_id text,
  p_end_to_end text,
  p_raw_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_plan text;
  v_amount integer;
  v_method text;
  v_base timestamptz;
begin
  update public.payments
     set status = 'paid',
         paid_at = now(),
         updated_at = now(),
         transaction_id = coalesce(p_transaction_id, transaction_id),
         end_to_end = coalesce(p_end_to_end, end_to_end),
         raw_status = coalesce(p_raw_status, raw_status)
   where id = p_payment_id
     and status <> 'paid'
  returning user_id, plan_id, amount_cents, method
    into v_user, v_plan, v_amount, v_method;

  if v_user is null then
    return false;
  end if;

  -- Renovação de quem ainda está no prazo soma ao que resta, em vez de zerar.
  -- Quem paga antes de vencer não pode perder os dias que já comprou.
  select greatest(coalesce(current_period_end, now()), now())
    into v_base
    from public.subscriptions
   where user_id = v_user;

  insert into public.subscriptions as s (
    user_id, status, plan_id, current_period_end, payment_method,
    gateway, last_payment_id, last_amount_cents, next_charge_at, updated_at
  )
  values (
    v_user, 'active', v_plan, coalesce(v_base, now()) + make_interval(days => p_days),
    v_method, 'syncpay', p_payment_id, v_amount,
    coalesce(v_base, now()) + make_interval(days => p_days), now()
  )
  on conflict (user_id) do update
     set status = 'active',
         plan_id = excluded.plan_id,
         current_period_end = excluded.current_period_end,
         payment_method = excluded.payment_method,
         gateway = 'syncpay',
         last_payment_id = excluded.last_payment_id,
         last_amount_cents = excluded.last_amount_cents,
         next_charge_at = excluded.next_charge_at,
         cancel_at_period_end = false,
         updated_at = now();

  return true;
end;
$$;

-- Retira o acesso quando o dinheiro volta (reembolso, estorno, contestação).
--
-- O período NÃO é preservado de propósito: quem recebeu o dinheiro de volta não
-- continua com o produto. Deixar `current_period_end` no futuro com status
-- 'refunded' seria um convite a pagar, usar e estornar.
create or replace function public.revoke_payment(
  p_payment_id uuid,
  p_status payment_status,
  p_raw_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  update public.payments
     set status = p_status,
         raw_status = coalesce(p_raw_status, raw_status),
         updated_at = now()
   where id = p_payment_id
     and status <> p_status
  returning user_id into v_user;

  if v_user is null then
    return false;
  end if;

  update public.subscriptions
     set status = case
                    when p_status = 'refunded' then 'refunded'::subscription_status
                    when p_status = 'chargeback' then 'past_due'::subscription_status
                    else 'canceled'::subscription_status
                  end,
         current_period_end = least(coalesce(current_period_end, now()), now()),
         updated_at = now()
   where user_id = v_user
     and last_payment_id = p_payment_id;

  return true;
end;
$$;

-- As funções rodam como o dono (security definer) para poder escrever em
-- tabelas sem policy de escrita. Por isso a permissão de execução é fechada:
-- só a service_role, que é o webhook. Nunca anon nem authenticated — seria dar
-- ao celular do cliente uma função que ativa a própria assinatura.
revoke all on function public.apply_paid_payment(uuid, integer, text, text, text) from public;
revoke all on function public.revoke_payment(uuid, payment_status, text) from public;
grant execute on function public.apply_paid_payment(uuid, integer, text, text, text) to service_role;
grant execute on function public.revoke_payment(uuid, payment_status, text) to service_role;
