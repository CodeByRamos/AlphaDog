-- AlphaDog — assinaturas (paywall do app mobile).
--
-- O app é 100% pago: sem assinatura ativa, o tutor só acessa login, cadastro,
-- recuperação de senha e a própria tela de assinatura. Esta tabela é a fonte da
-- verdade desse acesso.
--
-- Segurança: o cliente do celular PODE LER a própria assinatura, mas NÃO PODE
-- escrever. Não existe policy de insert/update/delete para o usuário — quem
-- grava é o webhook do gateway, que roda com a service_role e ignora RLS. Assim
-- o tutor não consegue se conceder acesso escrevendo uma linha "active" pelo
-- app. É esta a validação de servidor: o estado de pagamento nasce no gateway,
-- não no celular.

-- ---------------------------------------------------------------- enum

-- Espelha o SubscriptionStatus do Prisma (site), para o app e o funil falarem a
-- mesma língua sobre o mesmo usuário.
create type subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'expired'
);

-- ---------------------------------------------------------------- tabela

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  -- Uma assinatura por usuário. O webhook faz upsert por user_id.
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status subscription_status not null default 'incomplete',
  -- Slug do plano (mensal, trimestral, semestral) — o catálogo vive no código
  -- compartilhado (@alphadog/core), não no banco, para preço não virar dado
  -- solto que ninguém sabe de onde veio.
  plan_id text,
  -- Até quando o acesso vale. É o campo que decide "ativo" junto com o status.
  -- Com PIX avulso (cobrança CPF), a renovação estende esta data em N dias.
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Meio usado na última cobrança: pix, credit_card, debit_card.
  payment_method text,
  -- Identificadores no gateway (Asaas/etc), para o webhook casar o evento com a
  -- assinatura sem ambiguidade.
  gateway_customer_id text,
  gateway_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id);
create index subscriptions_status_idx on public.subscriptions (status);

-- ---------------------------------------------------------------- RLS

alter table public.subscriptions enable row level security;

-- Só leitura da própria assinatura. Sem policy de escrita de propósito: o
-- cliente jamais grava aqui. O webhook usa service_role e passa por cima do RLS.
create policy "dono lê a própria assinatura"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- helper

-- Verdade única de "tem acesso", reutilizável em policies de outras tabelas.
-- security definer para poder ler subscriptions independentemente do RLS de
-- quem chamou; search_path fixo para não ser sequestrada por uma tabela homônima
-- num schema do usuário.
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

-- ---------------------------------------------------------------- enforcement de servidor (quando a cobrança entrar)
--
-- Hoje o gate é no cliente (o app redireciona para a tela de assinatura). Quando
-- a cobrança estiver no ar, descomente a policy abaixo para o banco recusar
-- gravar sessão de treino sem assinatura ativa — aí nem um cliente adulterado
-- burla o paywall. Fica comentado agora porque, sem cobrança viva, travaria o
-- app inteiro (inclusive a sua demo).
--
-- drop policy "dono cria sessões nos próprios cães" on public.training_sessions;
-- create policy "dono cria sessões nos próprios cães"
--   on public.training_sessions for insert
--   with check (
--     auth.uid() = owner_id
--     and public.has_active_subscription(auth.uid())
--     and exists (
--       select 1 from public.dogs d
--       where d.id = dog_id and d.owner_id = auth.uid()
--     )
--   );
--
-- Para liberar a SUA conta durante o desenvolvimento (comp), rode uma vez no
-- SQL editor do Supabase, trocando o e-mail:
--
-- insert into public.subscriptions (user_id, status, plan_id, current_period_end)
-- select id, 'active', 'trimestral', now() + interval '1 year'
-- from auth.users where email = 'voce@exemplo.com'
-- on conflict (user_id) do update
--   set status = 'active', current_period_end = excluded.current_period_end;
