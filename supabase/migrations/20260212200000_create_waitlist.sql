create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  source text not null default 'landing',
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
