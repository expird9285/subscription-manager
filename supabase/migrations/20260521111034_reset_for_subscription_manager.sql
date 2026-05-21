do $$
declare
  table_record record;
begin
  for table_record in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'drop table if exists %I.%I cascade',
      table_record.schemaname,
      table_record.tablename
    );
  end loop;
end $$;

do $$
declare
  function_record record;
begin
  for function_record in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format(
      'drop function if exists %I.%I(%s) cascade',
      function_record.schema_name,
      function_record.function_name,
      function_record.args
    );
  end loop;
end $$;

do $$
declare
  type_record record;
begin
  for type_record in
    select n.nspname as schema_name, t.typname as type_name
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype = 'e'
  loop
    execute format(
      'drop type if exists %I.%I cascade',
      type_record.schema_name,
      type_record.type_name
    );
  end loop;
end $$;

create extension if not exists pgcrypto;

do $$
begin
  create type public.subscription_billing_cycle as enum (
    'monthly',
    'yearly',
    'quarterly',
    'weekly',
    'custom'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.subscription_status as enum (
    'active',
    'paused',
    'cancel_pending',
    'cancelled',
    'trial'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_type as enum (
    'd7',
    'd3',
    'd1',
    'dday'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  category text,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'KRW' check (length(trim(currency)) between 3 and 8),
  billing_cycle public.subscription_billing_cycle not null default 'monthly',
  next_billing_date date not null,
  payment_method text,
  status public.subscription_status not null default 'active',
  auto_renew boolean not null default true,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_next_billing_idx
  on public.subscriptions (user_id, next_billing_date);

create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  notification_type public.notification_type not null,
  target_date date not null,
  sent_at timestamptz not null default now(),
  unique (subscription_id, notification_type, target_date)
);

create index if not exists notification_logs_subscription_idx
  on public.notification_logs (subscription_id, target_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
alter table public.notification_logs enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.notification_logs to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;
grant select, insert, update, delete on public.notification_logs to service_role;

drop policy if exists "Users can view their own subscriptions" on public.subscriptions;
create policy "Users can view their own subscriptions"
on public.subscriptions
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert their own subscriptions" on public.subscriptions;
create policy "Users can insert their own subscriptions"
on public.subscriptions
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their own subscriptions" on public.subscriptions;
create policy "Users can update their own subscriptions"
on public.subscriptions
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their own subscriptions" on public.subscriptions;
create policy "Users can delete their own subscriptions"
on public.subscriptions
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can view logs for their subscriptions" on public.notification_logs;
create policy "Users can view logs for their subscriptions"
on public.notification_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.subscriptions s
    where s.id = notification_logs.subscription_id
      and s.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can insert logs for their subscriptions" on public.notification_logs;
create policy "Users can insert logs for their subscriptions"
on public.notification_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.subscriptions s
    where s.id = notification_logs.subscription_id
      and s.user_id = (select auth.uid())
  )
);
