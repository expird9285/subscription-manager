alter table public.subscriptions
add column if not exists split_count integer not null default 1
check (split_count >= 1 and split_count <= 99);

