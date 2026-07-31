create table if not exists public.redemptions (
  record_id bigint primary key,
  redeemed_at timestamptz not null default now()
);

alter table public.redemptions enable row level security;
