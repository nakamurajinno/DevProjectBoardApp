-- 組織 (Organization) 単位のマルチテナント化と招待機能
-- 20261103000000_add_auth_roles.sql の適用後に、SQL Editor へ貼り付けて実行するか `npx supabase db push` で適用する。
--
-- 仕様:
--   * ユーザーは必ず 1 つの組織に所属する (profiles.organization_id)。
--   * projects / activity_logs は organization_id を持ち、同じ組織のユーザーだけが参照・操作できる。
--   * サインアップ時の raw_user_meta_data で所属先を決める:
--       organization_name : 新しい組織を作成し、そのユーザーを管理者 (admin) にする
--       invitation_token  : 招待 (organization_invitations) の組織に、招待時のロールで参加する
--     どちらもない (Google ログインでの未登録ユーザー・匿名ユーザーなど) サインアップは拒否する。
--   * ゲストログイン (匿名ユーザー) は廃止。既存の匿名ユーザーは削除する。
--
-- 適用後、Supabase ダッシュボードで以下も設定すること:
--   * Authentication > Sign In / Providers > "Allow anonymous sign-ins" を OFF
--   * Authentication > URL Configuration > Redirect URLs に
--     <サイトURL>/auth/callback, <サイトURL>/auth/confirm, <サイトURL>/invite/accept を追加

-- ============================================================
-- organizations: 組織
-- ============================================================
create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ============================================================
-- ゲストログインの廃止: 匿名ユーザーを削除する (profiles は on delete cascade で削除される)
-- ============================================================
delete from auth.users where coalesce(is_anonymous, false);

-- ============================================================
-- 既存テーブルに organization_id を追加し、既存データを「マイ組織」に移行する
-- ============================================================
alter table public.profiles
  add column organization_id uuid references public.organizations (id) on delete cascade,
  add column email text not null default '';

alter table public.projects
  add column organization_id uuid references public.organizations (id) on delete cascade;

alter table public.activity_logs
  add column organization_id uuid references public.organizations (id) on delete cascade;

update public.profiles p
set email = coalesce(u.email, '')
from auth.users u
where u.id = p.id;

do $$
declare
  default_org uuid;
begin
  if exists (select 1 from public.profiles) or exists (select 1 from public.projects) then
    insert into public.organizations (name) values ('マイ組織') returning id into default_org;

    update public.profiles set organization_id = default_org where organization_id is null;
    update public.projects set organization_id = default_org where organization_id is null;
    update public.activity_logs l
    set organization_id = p.organization_id
    from public.projects p
    where p.id = l.project_id and l.organization_id is null;

    -- 組織に管理者がいなければ、最も古いユーザーを管理者にする
    update public.profiles
    set role = 'admin'
    where id = (
      select id from public.profiles
      where organization_id = default_org
      order by created_at
      limit 1
    )
    and not exists (
      select 1 from public.profiles where organization_id = default_org and role = 'admin'
    );
  end if;
end;
$$;

alter table public.profiles alter column organization_id set not null;
alter table public.projects alter column organization_id set not null;
alter table public.activity_logs alter column organization_id set not null;

create index profiles_organization_id_idx on public.profiles (organization_id);
create index projects_organization_id_created_at_idx on public.projects (organization_id, created_at);
create index activity_logs_organization_id_idx on public.activity_logs (organization_id);

-- ============================================================
-- organization_invitations: 組織への招待
-- token は招待リンク / 招待コードとして使う推測困難な値
-- ============================================================
create function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

revoke execute on function public.current_organization_id() from public, anon;
grant execute on function public.current_organization_id() to authenticated;

create table public.organization_invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid             not null default public.current_organization_id()
                                   references public.organizations (id) on delete cascade,
  email           text             not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  role            public.user_role not null default 'editor',
  token           text             not null unique default replace(gen_random_uuid()::text, '-', ''),
  invited_by      uuid             default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz      not null default now(),
  expires_at      timestamptz      not null default now() + interval '7 days',
  accepted_at     timestamptz,
  accepted_by     uuid             references auth.users (id) on delete set null
);

-- 同じ組織・同じメールアドレスへの未使用の招待は 1 件まで
create unique index organization_invitations_pending_email_idx
  on public.organization_invitations (organization_id, lower(email))
  where accepted_at is null;

-- ============================================================
-- 新規データの organization_id を自動設定する
-- ============================================================
alter table public.projects
  alter column organization_id set default public.current_organization_id();

-- 活動ログはプロジェクトと同じ組織に属する (RLS により他組織のプロジェクトは見えないため null → エラーになる)
create function public.set_activity_log_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select organization_id into new.organization_id
  from public.projects
  where id = new.project_id;
  return new;
end;
$$;

create trigger activity_logs_set_organization
  before insert or update of project_id on public.activity_logs
  for each row execute function public.set_activity_log_organization();

-- organization_id 列が増えたため、p.* を展開し直すようにビューを作り直す
drop view public.projects_with_progress;
create view public.projects_with_progress
with (security_invoker = true)
as
select
  p.*,
  coalesce(
    (select sum(l.hours) from public.activity_logs l where l.project_id = p.id),
    0
  )::numeric(9, 2) as actual_hours
from public.projects p;

-- ============================================================
-- サインアップ時の処理 (組織の作成 / 招待による参加) に置き換える
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  org_name text  := nullif(btrim(meta ->> 'organization_name'), '');
  inv      public.organization_invitations;
  org_id   uuid;
  new_role public.user_role;
begin
  if coalesce(new.is_anonymous, false) then
    raise exception 'anonymous sign-ins are disabled';
  end if;

  if nullif(meta ->> 'invitation_token', '') is not null then
    select * into inv
    from public.organization_invitations
    where token = meta ->> 'invitation_token'
      and accepted_at is null
      and expires_at > now()
      and lower(email) = lower(new.email)
    for update;

    if not found then
      raise exception 'invalid or expired invitation';
    end if;

    org_id := inv.organization_id;
    new_role := inv.role;
    update public.organization_invitations
    set accepted_at = now(), accepted_by = new.id
    where id = inv.id;
  elsif org_name is not null then
    insert into public.organizations (name)
    values (left(org_name, 100))
    returning id into org_id;
    new_role := 'admin';
  else
    -- 招待も組織作成もない登録 (未登録ユーザーの Google ログインなど) は受け付けない
    raise exception 'sign up requires an organization or an invitation';
  end if;

  insert into public.profiles (id, organization_id, display_name, email, role)
  values (
    new.id,
    org_id,
    left(coalesce(
      nullif(btrim(meta ->> 'display_name'), ''),
      meta ->> 'full_name',
      meta ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ), 50),
    coalesce(new.email, ''),
    new_role
  );
  return new;
end;
$$;

-- メールアドレス変更を profiles に反映する
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ============================================================
-- RPC
-- ============================================================

-- 招待コードの確認 (未ログインのサインアップ画面から呼ぶ)。有効な招待のみ返す。
create function public.get_invitation(p_token text)
returns table (organization_name text, email text, role public.user_role, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, i.email, i.role, i.expires_at
  from public.organization_invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token = p_token
    and i.accepted_at is null
    and i.expires_at > now();
$$;

revoke execute on function public.get_invitation(text) from public;
grant execute on function public.get_invitation(text) to anon, authenticated;

-- メールアドレスが登録済みか (ログイン失敗時のメッセージ出し分け・招待前の確認用)。
-- ユーザー列挙に使われないよう、サーバー (service_role) からのみ呼べるようにする。
create function public.is_email_registered(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users where lower(email) = lower(p_email));
$$;

revoke execute on function public.is_email_registered(text) from public, anon, authenticated;
grant execute on function public.is_email_registered(text) to service_role;

-- 管理者による同じ組織のメンバーのロール変更。管理者が 0 人になる変更は拒否する。
create function public.set_member_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid := public.current_organization_id();
begin
  if org_id is null or public.current_user_role() is distinct from 'admin' then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  -- 同時変更で管理者が 0 人にならないよう、組織のメンバー行をロックする
  perform 1 from public.profiles where organization_id = org_id for update;

  if not exists (select 1 from public.profiles where id = p_user_id and organization_id = org_id) then
    raise exception 'member not found' using errcode = 'P0002';
  end if;

  if p_role <> 'admin' and not exists (
    select 1 from public.profiles
    where organization_id = org_id and role = 'admin' and id <> p_user_id
  ) then
    raise exception 'organization must have at least one admin' using errcode = 'P0001';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

-- 自分の表示名の変更 (ロールや所属組織は変更させない)
create function public.update_my_display_name(p_display_name text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set display_name = left(btrim(p_display_name), 50)
  where id = auth.uid() and btrim(p_display_name) <> '';
$$;

revoke execute on function public.set_member_role(uuid, public.user_role) from public, anon;
revoke execute on function public.update_my_display_name(text) from public, anon;
grant execute on function public.set_member_role(uuid, public.user_role) to authenticated;
grant execute on function public.update_my_display_name(text) to authenticated;

-- ============================================================
-- Row Level Security: 同じ組織のデータだけを参照・操作できるようにする
-- ============================================================
alter table public.organizations enable row level security;
alter table public.organization_invitations enable row level security;

create policy "所属組織は参照可能" on public.organizations
  for select to authenticated
  using (id = (select public.current_organization_id()));

create policy "管理者は自組織の招待を参照可能" on public.organization_invitations
  for select to authenticated
  using (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  );
create policy "管理者は自組織へ招待可能" on public.organization_invitations
  for insert to authenticated
  with check (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
    and accepted_at is null
  );
create policy "管理者は自組織の招待を削除可能" on public.organization_invitations
  for delete to authenticated
  using (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  );

-- profiles: 同じ組織のメンバーを参照できる。更新は RPC (set_member_role / update_my_display_name) 経由のみ。
drop policy "本人または管理者は参照可能" on public.profiles;
drop policy "管理者は更新可能" on public.profiles;

create policy "同じ組織のメンバーは参照可能" on public.profiles
  for select to authenticated
  using (organization_id = (select public.current_organization_id()));

-- projects / activity_logs
drop policy "ログインユーザーは参照可能" on public.projects;
drop policy "編集権限があれば登録可能" on public.projects;
drop policy "編集権限があれば更新可能" on public.projects;
drop policy "編集権限があれば削除可能" on public.projects;
drop policy "ログインユーザーは参照可能" on public.activity_logs;
drop policy "編集権限があれば登録可能" on public.activity_logs;
drop policy "編集権限があれば更新可能" on public.activity_logs;
drop policy "編集権限があれば削除可能" on public.activity_logs;

create policy "同じ組織なら参照可能" on public.projects
  for select to authenticated
  using (organization_id = (select public.current_organization_id()));
create policy "同じ組織で編集権限があれば登録可能" on public.projects
  for insert to authenticated
  with check (
    organization_id = (select public.current_organization_id()) and (select public.can_edit())
  );
create policy "同じ組織で編集権限があれば更新可能" on public.projects
  for update to authenticated
  using (organization_id = (select public.current_organization_id()) and (select public.can_edit()))
  with check (organization_id = (select public.current_organization_id()) and (select public.can_edit()));
create policy "同じ組織で編集権限があれば削除可能" on public.projects
  for delete to authenticated
  using (organization_id = (select public.current_organization_id()) and (select public.can_edit()));

create policy "同じ組織なら参照可能" on public.activity_logs
  for select to authenticated
  using (organization_id = (select public.current_organization_id()));
create policy "同じ組織で編集権限があれば登録可能" on public.activity_logs
  for insert to authenticated
  with check (
    organization_id = (select public.current_organization_id()) and (select public.can_edit())
  );
create policy "同じ組織で編集権限があれば更新可能" on public.activity_logs
  for update to authenticated
  using (organization_id = (select public.current_organization_id()) and (select public.can_edit()))
  with check (organization_id = (select public.current_organization_id()) and (select public.can_edit()));
create policy "同じ組織で編集権限があれば削除可能" on public.activity_logs
  for delete to authenticated
  using (organization_id = (select public.current_organization_id()) and (select public.can_edit()));
