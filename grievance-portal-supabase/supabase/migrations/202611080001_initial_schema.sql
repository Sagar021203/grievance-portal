-- The Department of Us
-- Run this entire file once in Supabase Dashboard > SQL Editor.
-- All complaint access is enforced by PostgreSQL RLS, not by the frontend.

create extension if not exists pgcrypto;

do $$ begin
  create type public.complaint_status as enum (
    'awaiting_response',
    'awaiting_acknowledgement',
    'closed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.member_role as enum ('department', 'user');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null,
  role public.member_role not null default 'user',
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9][a-z0-9._-]{2,23}$'),
  constraint profiles_display_name_length check (char_length(trim(display_name)) between 1 and 60)
);

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username));

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  case_number bigint generated always as identity unique,
  reference text generated always as ('DUS-' || lpad(case_number::text, 5, '0')) stored,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 4 and 90),
  category text not null check (category in ('Attention', 'Food & snacks', 'Quality time', 'Affection', 'Household', 'Other')),
  body text not null check (char_length(trim(body)) between 12 and 1200),
  severity text not null check (severity in ('A tiny inconvenience', 'A medium-sized betrayal', 'An emotional emergency')),
  status public.complaint_status not null default 'awaiting_response',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint complaints_different_people check (sender_id <> recipient_id)
);

create table if not exists public.complaint_replies (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null unique references public.complaints (id) on delete cascade,
  responder_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 2 and 1600),
  created_at timestamptz not null default now()
);

create index if not exists complaints_sender_created_idx
  on public.complaints (sender_id, created_at desc);
create index if not exists complaints_recipient_created_idx
  on public.complaints (recipient_id, created_at desc);
create index if not exists complaints_status_idx
  on public.complaints (status);
create index if not exists complaint_replies_responder_idx
  on public.complaint_replies (responder_id);

-- Create a display-only profile whenever someone registers with Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_display_name text;
  v_role public.member_role;
begin
  v_username := lower(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(coalesce(new.email, ''), '@', 1)),
    '[^a-z0-9._-]', '', 'g'
  ));
  if v_username is null or char_length(v_username) < 3 then
    v_username := 'love-' || substr(new.id::text, 1, 8);
  end if;
  if char_length(v_username) > 24 then
    v_username := left(v_username, 24);
  end if;
  if exists (select 1 from public.profiles p where lower(p.username) = v_username) then
    v_username := left(v_username, 16) || '-' || substr(new.id::text, 1, 6);
  end if;

  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Department member'
  );

  v_role := case lower(coalesce(new.raw_user_meta_data ->> 'role', 'user'))
    when 'department' then 'department'::public.member_role
    else 'user'::public.member_role
  end;

  insert into public.profiles (id, username, display_name, role)
  values (new.id, v_username, left(v_display_name, 60), v_role);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- A recipient may submit one official reply. The trigger advances the case.
create or replace function public.mark_complaint_replied()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.complaints
     set status = 'awaiting_acknowledgement', updated_at = now()
   where id = new.complaint_id
     and recipient_id = new.responder_id
     and status = 'awaiting_response';
  return new;
end;
$$;

revoke all on function public.mark_complaint_replied() from public, anon, authenticated;
drop trigger if exists on_complaint_reply_created on public.complaint_replies;
create trigger on_complaint_reply_created
  after insert on public.complaint_replies
  for each row execute procedure public.mark_complaint_replied();

-- Only the person who filed a complaint can close it, and only after a reply.
create or replace function public.finish_the_drama(p_complaint_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.complaints
     set status = 'closed', closed_at = now(), updated_at = now()
   where id = p_complaint_id
     and sender_id = (select auth.uid())
     and status = 'awaiting_acknowledgement';

  if not found then
    raise exception 'Only the person who filed this case can close it after a reply.'
      using errcode = '42501';
  end if;
end;
$$;

-- Least-privilege grants. The publishable key is safe to use only because RLS is enabled below.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.complaints from anon, authenticated;
revoke all on table public.complaint_replies from anon, authenticated;
grant usage on schema public to authenticated;
grant usage on type public.complaint_status, public.member_role to authenticated;
grant select on table public.profiles to authenticated;
grant select, insert on table public.complaints to authenticated;
grant update (status, closed_at, updated_at) on table public.complaints to authenticated;
grant select, insert on table public.complaint_replies to authenticated;
revoke all on function public.finish_the_drama(uuid) from public, anon;
grant execute on function public.finish_the_drama(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.complaints enable row level security;
alter table public.complaint_replies enable row level security;

-- The authenticated directory exposes display names/usernames only, never email addresses.
drop policy if exists "Authenticated people can browse the directory" on public.profiles;
create policy "Authenticated people can browse the directory"
  on public.profiles for select to authenticated
  using (true);

-- A case is visible only to the two people named on it.
drop policy if exists "Participants can read their own cases" on public.complaints;
create policy "Participants can read their own cases"
  on public.complaints for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

drop policy if exists "People can file a case to another person" on public.complaints;
create policy "People can file a case to another person"
  on public.complaints for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and recipient_id <> (select auth.uid())
  );

drop policy if exists "The filer can close a replied case" on public.complaints;
create policy "The filer can close a replied case"
  on public.complaints for update to authenticated
  using (
    (select auth.uid()) = sender_id
    and status = 'awaiting_acknowledgement'
  )
  with check (
    (select auth.uid()) = sender_id
    and status = 'closed'
  );

-- Replies inherit the same two-person privacy boundary as their parent case.
drop policy if exists "Participants can read case replies" on public.complaint_replies;
create policy "Participants can read case replies"
  on public.complaint_replies for select to authenticated
  using (
    exists (
      select 1 from public.complaints c
       where c.id = complaint_id
         and ((select auth.uid()) = c.sender_id or (select auth.uid()) = c.recipient_id)
    )
  );

drop policy if exists "Only the recipient can reply once" on public.complaint_replies;
create policy "Only the recipient can reply once"
  on public.complaint_replies for insert to authenticated
  with check (
    (select auth.uid()) = responder_id
    and exists (
      select 1 from public.complaints c
       where c.id = complaint_id
         and c.recipient_id = (select auth.uid())
         and c.status = 'awaiting_response'
    )
  );

-- Publish only the tables used by the live register/detail view.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin execute 'alter publication supabase_realtime add table public.complaints';
    exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.complaint_replies';
    exception when duplicate_object then null; end;
  end if;
end $$;
