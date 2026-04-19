-- ============================================================
-- PICK FIT 데이터베이스 스키마 (재실행 안전 버전)
-- Supabase SQL Editor에 붙여넣고 실행하세요
-- ============================================================

create table if not exists public.users (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  pi_uid            text,
  profile_image_url text,
  plan              text not null default 'free' check (plan in ('free', 'basic', 'pro')),
  tryon_count       int  not null default 0,
  created_at        timestamptz not null default now()
);

create table if not exists public.garments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  image_url  text not null,
  source_url text,
  category   text check (category in ('top', 'bottom', 'dress', 'outer', 'etc')),
  shop_name  text,
  created_at timestamptz not null default now()
);

create table if not exists public.try_ons (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  garment_id uuid not null references public.garments(id) on delete cascade,
  result_url text,
  status     text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  cost       numeric(10, 4) default 0.03,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id             uuid primary key default gen_random_uuid(),
  referrer_id    uuid not null references public.users(id) on delete cascade,
  referee_id     uuid not null references public.users(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending', 'completed')),
  reward_granted boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (referrer_id, referee_id)
);

create table if not exists public.pick_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  type          text not null check (type in ('earn', 'spend', 'refund')),
  amount        numeric(12, 2) not null,
  balance_after numeric(12, 2) not null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- RLS 활성화
-- ============================================================
alter table public.users             enable row level security;
alter table public.garments          enable row level security;
alter table public.try_ons           enable row level security;
alter table public.referrals         enable row level security;
alter table public.pick_transactions enable row level security;

-- ============================================================
-- RLS 정책 (기존 정책 삭제 후 재생성)
-- ============================================================

-- users
drop policy if exists "본인 프로필 조회" on public.users;
drop policy if exists "본인 프로필 수정" on public.users;
create policy "본인 프로필 조회" on public.users for select using (auth.uid() = id);
create policy "본인 프로필 수정" on public.users for update using (auth.uid() = id);

-- garments
drop policy if exists "본인 아이템 조회" on public.garments;
drop policy if exists "본인 아이템 등록" on public.garments;
drop policy if exists "본인 아이템 삭제" on public.garments;
create policy "본인 아이템 조회" on public.garments for select using (auth.uid() = user_id);
create policy "본인 아이템 등록" on public.garments for insert with check (auth.uid() = user_id);
create policy "본인 아이템 삭제" on public.garments for delete using (auth.uid() = user_id);

-- try_ons
drop policy if exists "본인 피팅 조회" on public.try_ons;
drop policy if exists "본인 피팅 생성" on public.try_ons;
create policy "본인 피팅 조회" on public.try_ons for select using (auth.uid() = user_id);
create policy "본인 피팅 생성" on public.try_ons for insert with check (auth.uid() = user_id);

-- referrals
drop policy if exists "본인 초대 조회" on public.referrals;
drop policy if exists "초대 생성"      on public.referrals;
create policy "본인 초대 조회" on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referee_id);
create policy "초대 생성"      on public.referrals for insert with check (auth.uid() = referrer_id);

-- pick_transactions
drop policy if exists "본인 토큰 내역 조회" on public.pick_transactions;
create policy "본인 토큰 내역 조회" on public.pick_transactions for select using (auth.uid() = user_id);

-- ============================================================
-- 트리거: 회원가입 시 users 테이블 자동 생성
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 인덱스
-- ============================================================
create index if not exists idx_try_ons_created_at on public.try_ons(created_at);
create index if not exists idx_garments_user_id   on public.garments(user_id);
create index if not exists idx_try_ons_user_id    on public.try_ons(user_id);
