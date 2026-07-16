-- AlphaDog — tabelas do aplicativo mobile.
--
-- Chaveadas em auth.users do Supabase, não na tabela User do Auth.js: o mobile
-- usa Supabase Auth e fala direto com o banco. O website mantém o Prisma para
-- o funil e o paywall, no mesmo Postgres.
--
-- RLS em tudo. Com o cliente falando direto do celular, a política do banco é a
-- única fronteira de segurança que existe — não há servidor nosso no meio para
-- filtrar. Uma tabela sem RLS aqui é uma tabela pública.

-- ---------------------------------------------------------------- enums

create type dog_age_group as enum ('puppy', 'adolescent', 'adult', 'senior');
create type dog_gender as enum ('male', 'female');
create type dog_energy as enum ('calm', 'moderate', 'high', 'very_high');
create type dog_experience as enum ('none', 'basic', 'intermediate');
create type training_goal as enum ('obedience', 'fix_behavior', 'socialize', 'tricks', 'bond');
create type exercise_id as enum ('sit', 'paw', 'down');

-- ---------------------------------------------------------------- dogs

create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  breed_slug text,
  age_group dog_age_group not null,
  gender dog_gender,
  -- Gramas, inteiro. Float traria 4.199999 kg para o banco.
  weight_grams int check (weight_grams between 500 and 120000),
  energy_level dog_energy not null default 'moderate',
  experience_level dog_experience not null default 'none',
  -- Array de texto em vez de tabela de junção: a lista é curta, fechada e
  -- sempre lida junto com o cão. Junção aqui seria cerimônia sem ganho.
  difficulties text[] not null default '{}',
  goal training_goal not null default 'obedience',
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dogs_owner_idx on public.dogs (owner_id);

-- ------------------------------------------------------- training_sessions

create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  exercise_id exercise_id not null,
  success_count int not null default 0 check (success_count >= 0),
  total_reps int not null check (total_reps > 0),
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  -- Gravado, não calculado na leitura: a regra do denominador (tentado, não
  -- planejado) vive no domínio, e recalcular no SQL duplicaria essa decisão.
  success_rate real not null default 0 check (success_rate between 0 and 1),
  -- Sessão encerrada pelo tutor antes do fim ainda conta progresso.
  completed boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index sessions_dog_idx on public.training_sessions (dog_id, started_at desc);
create index sessions_owner_idx on public.training_sessions (owner_id, started_at desc);

-- ---------------------------------------------------------------- RLS

alter table public.dogs enable row level security;
alter table public.training_sessions enable row level security;

-- Uma política por operação, e não `for all`: assim uma mudança futura no
-- update não afeta silenciosamente o delete.

create policy "dono lê seus cães"
  on public.dogs for select
  using (auth.uid() = owner_id);

create policy "dono cria seus cães"
  on public.dogs for insert
  with check (auth.uid() = owner_id);

create policy "dono edita seus cães"
  on public.dogs for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "dono apaga seus cães"
  on public.dogs for delete
  using (auth.uid() = owner_id);

create policy "dono lê suas sessões"
  on public.training_sessions for select
  using (auth.uid() = owner_id);

-- O with check confirma que o cão também é do usuário: sem isso, alguém
-- poderia gravar sessão no cão de outra pessoa passando um dog_id qualquer.
create policy "dono cria sessões nos próprios cães"
  on public.training_sessions for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.dogs d
      where d.id = dog_id and d.owner_id = auth.uid()
    )
  );

create policy "dono atualiza suas sessões"
  on public.training_sessions for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------- triggers

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dogs_touch_updated_at
  before update on public.dogs
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- storage

-- Bucket das fotos de perfil. Privado: foto do cão numa casa identifica a casa.
insert into storage.buckets (id, name, public)
values ('dog-photos', 'dog-photos', false)
on conflict (id) do nothing;

-- Caminho é <uid>/<arquivo>. A política lê o primeiro segmento e compara com o
-- usuário — é o que impede alguém de ler a pasta de outro.
create policy "dono lê suas fotos"
  on storage.objects for select
  using (bucket_id = 'dog-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dono envia suas fotos"
  on storage.objects for insert
  with check (bucket_id = 'dog-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dono troca suas fotos"
  on storage.objects for update
  using (bucket_id = 'dog-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dono apaga suas fotos"
  on storage.objects for delete
  using (bucket_id = 'dog-photos' and (storage.foldername(name))[1] = auth.uid()::text);
