alter table if exists public.profiles
  add column if not exists ai_creative_enabled boolean not null default true,
  add column if not exists ai_organizational_enabled boolean not null default true;
