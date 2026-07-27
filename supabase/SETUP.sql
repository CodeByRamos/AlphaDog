-- ============================================================================
-- AlphaDog — configuração do banco em UM passo.
--
-- Junta as migrations 0002 (assinaturas) e 0003 (biblioteca de exercícios), que
-- ainda não foram aplicadas, e libera a sua conta para testar.
--
-- COMO USAR:
--   1. Troque SEU_EMAIL_AQUI (linha do final) pelo e-mail da sua conta no app
--   2. Cole tudo no SQL Editor do Supabase e clique em RUN
--
-- Pode rodar mais de uma vez sem quebrar nada.
--
-- NÃO inclui a migration 0004 (trava de servidor) de propósito: ela recusa
-- gravar treino sem assinatura ativa, e com a cobrança ainda desligada isso
-- trancaria todo mundo. Aplique 0004 quando o pagamento estiver no ar.
-- ============================================================================


-- ---------------------------------------------------------------- assinaturas

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum (
      'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'expired'
    );
  end if;
end $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status subscription_status not null default 'incomplete',
  plan_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  payment_method text,
  gateway_customer_id text,
  gateway_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

alter table public.subscriptions enable row level security;

-- O dono LÊ a própria assinatura, mas NÃO ESCREVE. Não existe policy de escrita
-- de propósito: quem grava é o webhook do pagamento, com a service_role. É isso
-- que impede alguém de se conceder acesso pelo app.
drop policy if exists "dono lê a própria assinatura" on public.subscriptions;
create policy "dono lê a própria assinatura"
  on public.subscriptions for select
  using (auth.uid() = user_id);

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- Verdade única de "tem acesso", usada pelo app e pela trava de servidor.
create or replace function public.has_active_subscription(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;


-- ------------------------------------------------- biblioteca de exercícios

-- O app passou de 3 para 11 comandos. Sem estes valores no enum, o banco recusa
-- gravar sessão dos exercícios novos.
alter type exercise_id add value if not exists 'touch';
alter type exercise_id add value if not exists 'stay';
alter type exercise_id add value if not exists 'come';
alter type exercise_id add value if not exists 'heel';
alter type exercise_id add value if not exists 'watch';
alter type exercise_id add value if not exists 'leave_it';
alter type exercise_id add value if not exists 'wait_food';
alter type exercise_id add value if not exists 'find_it';


-- ---------------------------------------------------------------- sua conta
--
-- ⚠️ TROQUE o e-mail abaixo pelo da SUA conta no aplicativo.
-- Libera acesso por 1 ano, para você testar e demonstrar.
-- Repita este bloco trocando o e-mail para liberar sócios e testadores.

insert into public.subscriptions (user_id, status, plan_id, current_period_end)
select id, 'active', 'trimestral', now() + interval '1 year'
from auth.users
where email = 'SEU_EMAIL_AQUI'
on conflict (user_id) do update
  set status = 'active',
      plan_id = 'trimestral',
      current_period_end = excluded.current_period_end;


-- ---------------------------------------------------------------- conferência

select
  u.email,
  s.status,
  s.current_period_end,
  public.has_active_subscription(u.id) as tem_acesso
from auth.users u
left join public.subscriptions s on s.user_id = u.id;
