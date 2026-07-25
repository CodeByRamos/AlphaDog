-- AlphaDog — o paywall passa a valer no servidor, não só no app.
--
-- Até aqui o bloqueio era do cliente: o Gate redirecionava para /subscribe. Isso
-- para o usuário honesto, mas não para um APK adulterado ou uma chamada direta à
-- API com a anon key, que é pública por design. Sem esta migration, "app pago"
-- é uma decisão de UI.
--
-- Aqui a regra vira condição de gravação no banco: sem assinatura ativa, o
-- Postgres recusa a sessão de treino. Não existe caminho por volta — nem cliente
-- modificado, nem curl.
--
-- ⚠️ APLIQUE SÓ QUANDO A COBRANÇA ESTIVER NO AR (ou depois de liberar sua conta
-- e a dos testadores, ver docs/PENDENCIAS.md). Aplicar antes tranca todo mundo,
-- inclusive você, fora do próprio treino.

-- ---------------------------------------------------- sessões de treino

drop policy if exists "dono cria sessões nos próprios cães" on public.training_sessions;

create policy "dono cria sessões nos próprios cães"
  on public.training_sessions for insert
  with check (
    auth.uid() = owner_id
    -- A verdade do acesso, centralizada na função da migration 0002: status
    -- ativo/trial E dentro do período pago.
    and public.has_active_subscription(auth.uid())
    and exists (
      select 1 from public.dogs d
      where d.id = dog_id and d.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------- cães
--
-- Criar cão é o onboarding, que já é usar o produto. Sem esta regra, um cliente
-- adulterado poderia cadastrar cães à vontade e só falhar ao gravar a sessão —
-- o bloqueio deve acontecer na primeira ação paga, não na segunda.

drop policy if exists "dono cria seus cães" on public.dogs;

create policy "dono cria seus cães"
  on public.dogs for insert
  with check (
    auth.uid() = owner_id
    and public.has_active_subscription(auth.uid())
  );

-- ---------------------------------------------------- leitura
--
-- LER continua liberado de propósito: quem deixou de pagar não perde o
-- histórico do próprio cão. Ele volta a ver tudo ao reativar, e enquanto isso
-- não consegue TREINAR — que é o serviço. Apagar o acesso à leitura puniria o
-- cliente e complicaria a reativação, sem proteger receita nenhuma.

-- ---------------------------------------------------- auditoria
--
-- Registro de mudanças de assinatura. Sem isto, uma divergência entre o que o
-- gateway cobrou e o que o app liberou vira investigação sem evidência.

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event text not null,
  status_before subscription_status,
  status_after subscription_status,
  -- Corpo do webhook, para reconstruir o que o gateway disse.
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists subscription_events_user_idx
  on public.subscription_events (user_id, created_at desc);

alter table public.subscription_events enable row level security;

-- Só leitura do próprio histórico. Escrita é exclusiva do webhook
-- (service_role), pelo mesmo motivo de subscriptions.
create policy "dono lê os próprios eventos"
  on public.subscription_events for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------- trigger de auditoria

create or replace function public.log_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  insert into public.subscription_events (user_id, event, status_before, status_after)
  values (
    new.user_id,
    tg_op,
    case when tg_op = 'UPDATE' then old.status else null end,
    new.status
  );
  return new;
end;
$$;

drop trigger if exists subscriptions_audit on public.subscriptions;

create trigger subscriptions_audit
  after insert or update on public.subscriptions
  for each row execute function public.log_subscription_change();
