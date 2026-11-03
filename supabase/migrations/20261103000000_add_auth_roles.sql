-- 認証 (Supabase Auth) とロール (権限) 管理
-- 20261029000000_create_projects.sql の適用後に、SQL Editor へ貼り付けて実行するか `npx supabase db push` で適用する。
--
-- ロール:
--   viewer : 閲覧のみ
--   editor : 閲覧・編集
--   admin  : 管理者 (現時点では editor と同等。管理画面は未実装)
--
-- 新規ユーザーは viewer で作成される。ただし管理者が一人もいない間は、
-- 最初にサインアップした通常ユーザー (ゲスト = 匿名ユーザーを除く) が admin になる。
-- 権限の変更は SQL Editor で行う:
--   update public.profiles set role = 'editor' where id = (select id from auth.users where email = 'someone@example.com');

-- ============================================================
-- 列挙型 (src/types/index.ts の UserRole と一致させる)
-- ============================================================
create type public.user_role as enum ('viewer', 'editor', 'admin');

-- ============================================================
-- profiles: auth.users と 1:1 のユーザー情報・ロール
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text             not null default '',
  role         public.user_role not null default 'viewer',
  created_at   timestamptz      not null default now(),
  updated_at   timestamptz      not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- サインアップ時に profiles を自動作成する
-- ============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_role public.user_role := 'viewer';
begin
  -- 同時サインアップで admin が複数できないよう、判定の間はテーブルをロックする
  lock table public.profiles in share row exclusive mode;

  if not coalesce(new.is_anonymous, false)
     and not exists (select 1 from public.profiles where role = 'admin') then
    new_role := 'admin';
  end if;

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 既存ユーザーの profiles を作成し、管理者がいなければ最も古い通常ユーザーを admin にする
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  )
from auth.users u
on conflict (id) do nothing;

update public.profiles
set role = 'admin'
where id = (
  select u.id from auth.users u
  where not coalesce(u.is_anonymous, false)
  order by u.created_at
  limit 1
)
and not exists (select 1 from public.profiles where role = 'admin');

-- ============================================================
-- ロール判定ヘルパー
-- security definer で RLS を経由せずに profiles を読む (ポリシー内からの再帰参照を避ける)
-- ============================================================
create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 閲覧・編集 (editor) と 管理者 (admin) は書き込み可能。
-- ゲスト (匿名認証ユーザー) は profiles のロールに関係なく常に閲覧のみとする。
-- (管理者が誤って匿名ユーザーのロールを editor に変更しても書き込めないようにする)
create function public.can_edit()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    and coalesce(public.current_user_role() in ('editor', 'admin'), false);
$$;

revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.can_edit() from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.can_edit() to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;

-- 自分のプロフィールは誰でも読める。管理者は全員分を読める。
-- ロールの自己昇格を防ぐため、一般ユーザーには更新を許可しない。
create policy "本人または管理者は参照可能" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.current_user_role()) = 'admin');

create policy "管理者は更新可能" on public.profiles
  for update to authenticated
  using ((select public.current_user_role()) = 'admin')
  with check ((select public.current_user_role()) = 'admin');

-- 暫定ポリシー (anon に全操作を許可) を、ロールに基づくポリシーに置き換える
drop policy "暫定: 全ユーザーに全操作を許可" on public.projects;
drop policy "暫定: 全ユーザーに全操作を許可" on public.activity_logs;

create policy "ログインユーザーは参照可能" on public.projects
  for select to authenticated using (true);
create policy "編集権限があれば登録可能" on public.projects
  for insert to authenticated with check ((select public.can_edit()));
create policy "編集権限があれば更新可能" on public.projects
  for update to authenticated
  using ((select public.can_edit())) with check ((select public.can_edit()));
create policy "編集権限があれば削除可能" on public.projects
  for delete to authenticated using ((select public.can_edit()));

create policy "ログインユーザーは参照可能" on public.activity_logs
  for select to authenticated using (true);
create policy "編集権限があれば登録可能" on public.activity_logs
  for insert to authenticated with check ((select public.can_edit()));
create policy "編集権限があれば更新可能" on public.activity_logs
  for update to authenticated
  using ((select public.can_edit())) with check ((select public.can_edit()));
create policy "編集権限があれば削除可能" on public.activity_logs
  for delete to authenticated using ((select public.can_edit()));
