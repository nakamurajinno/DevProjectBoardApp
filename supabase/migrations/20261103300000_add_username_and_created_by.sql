-- ユーザー名 (ログインにも使える表示名) と、プロジェクト・活動ログの登録者
-- 20261103200000_seed_initial_admin.sql の適用後に、SQL Editor へ貼り付けて実行するか `npx supabase db push` で適用する。
--
--   * profiles.username : ログインID (メールアドレス) とは別の、自由に設定できるユーザー名 (例: じんの)。
--       - ログイン画面ではメールアドレスの代わりにユーザー名でもログインできるため、大文字小文字を区別せず一意にする。
--       - メールアドレスと区別できるよう「@」は使えない。
--       - display_name は互換のため残し、常に username と同じ値にする。
--   * projects.created_by / activity_logs.created_by : 登録したユーザー (profiles.id)。
--       - 登録時にトリガーで auth.uid() を設定する (クライアントからの値は無視する)。更新では変更しない。
--   * 既存のユーザーのユーザー名は「じんの」にする (一意制約のため 2 人目以降は「じんの2」「じんの3」…)。
--   * 既存のプロジェクト・活動ログの登録者は、その組織の最も古い管理者 (初期ユーザー) にする。

-- ============================================================
-- profiles.username
-- ============================================================
alter table public.profiles add column username text;

-- base が使われていなければ base、使われていれば base2, base3, … を返す
create function public.unique_username(p_base text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  base      text := left(nullif(btrim(replace(coalesce(p_base, ''), '@', '')), ''), 45);
  candidate text;
  n         int  := 1;
begin
  base := coalesce(base, 'user');
  candidate := base;
  while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
    n := n + 1;
    candidate := base || n;
  end loop;
  return candidate;
end;
$$;

revoke execute on function public.unique_username(text) from public, anon, authenticated;

-- 既存ユーザー: 初期ユーザー (nakamura.jinno@gmail.com) を最初に「じんの」にし、残りも順に設定する
do $$
declare
  r record;
begin
  for r in
    select id from public.profiles
    order by (lower(email) = 'nakamura.jinno@gmail.com') desc, created_at
  loop
    update public.profiles
    set username = public.unique_username('じんの')
    where id = r.id;
  end loop;
end;
$$;

update public.profiles set display_name = username;

alter table public.profiles
  alter column username set not null,
  add constraint profiles_username_check
    check (char_length(username) between 1 and 50 and username = btrim(username) and position('@' in username) = 0);

create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- ============================================================
-- サインアップ時に username を設定する
-- raw_user_meta_data.username があればそれを使い (重複時は一意制約違反で登録を拒否する)、
-- なければ (招待メールで作成されたユーザーなど) 表示名・メールアドレスから重複しない名前を作る。
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
  req_name text  := nullif(btrim(meta ->> 'username'), '');
  inv      public.organization_invitations;
  org_id   uuid;
  new_role public.user_role;
  uname    text;
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

  uname := coalesce(
    left(req_name, 50),
    public.unique_username(coalesce(
      nullif(btrim(meta ->> 'display_name'), ''),
      meta ->> 'full_name',
      meta ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ))
  );

  insert into public.profiles (id, organization_id, username, display_name, email, role)
  values (new.id, org_id, uname, uname, coalesce(new.email, ''), new_role);
  return new;
end;
$$;

-- ============================================================
-- RPC
-- ============================================================

-- ユーザー名からログイン用のメールアドレスを引く (未ログインのログイン画面・サインアップ時の重複確認から呼ぶ)。
-- 該当がなければ null。
create function public.get_login_email(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select email from public.profiles
  where lower(username) = lower(btrim(p_username))
  limit 1;
$$;

revoke execute on function public.get_login_email(text) from public;
grant execute on function public.get_login_email(text) to anon, authenticated;

-- 自分のユーザー名の変更 (招待メールからの登録完了時など)。重複時は一意制約違反 (23505) になる。
create function public.update_my_username(p_username text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set username = btrim(p_username), display_name = btrim(p_username)
  where id = auth.uid() and btrim(p_username) <> '';
$$;

revoke execute on function public.update_my_username(text) from public, anon;
grant execute on function public.update_my_username(text) to authenticated;

-- 旧 RPC も username と同期させる (重複しない名前に補正する)
create or replace function public.update_my_display_name(p_display_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(btrim(p_display_name), 50);
begin
  if v_name = '' then
    return;
  end if;
  if exists (
    select 1 from public.profiles where lower(username) = lower(v_name) and id <> auth.uid()
  ) then
    v_name := public.unique_username(v_name);
  end if;
  update public.profiles set username = v_name, display_name = v_name where id = auth.uid();
end;
$$;

-- ============================================================
-- 登録者 (created_by)
-- ============================================================
alter table public.projects
  add column created_by uuid references public.profiles (id) on delete set null;
alter table public.activity_logs
  add column created_by uuid references public.profiles (id) on delete set null;

-- 既存データ: 組織の最も古い管理者を登録者にする
update public.projects p
set created_by = (
  select pr.id from public.profiles pr
  where pr.organization_id = p.organization_id and pr.role = 'admin'
  order by pr.created_at
  limit 1
)
where p.created_by is null;

update public.activity_logs l
set created_by = (
  select pr.id from public.profiles pr
  where pr.organization_id = l.organization_id and pr.role = 'admin'
  order by pr.created_at
  limit 1
)
where l.created_by is null;

-- 登録時はログインユーザーを登録者にし、更新では登録者を変更させない
create function public.set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create trigger projects_set_created_by
  before insert or update on public.projects
  for each row execute function public.set_created_by();

create trigger activity_logs_set_created_by
  before insert or update on public.activity_logs
  for each row execute function public.set_created_by();

create index projects_created_by_idx on public.projects (created_by);
create index activity_logs_created_by_idx on public.activity_logs (created_by);

-- created_by 列と登録者のユーザー名 (created_by_name) を含めてビューを作り直す。
-- security_invoker のため profiles の RLS (同じ組織のメンバーのみ参照可) が適用される。
drop view public.projects_with_progress;
create view public.projects_with_progress
with (security_invoker = true)
as
select
  p.*,
  coalesce(
    (select sum(l.hours) from public.activity_logs l where l.project_id = p.id),
    0
  )::numeric(9, 2) as actual_hours,
  creator.username as created_by_name
from public.projects p
left join public.profiles creator on creator.id = p.created_by;
