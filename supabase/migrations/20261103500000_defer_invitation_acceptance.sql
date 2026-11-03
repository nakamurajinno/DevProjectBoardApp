-- 招待メール送信時点でメンバー登録されてしまう不具合の修正
-- 20261103400000_restrict_login_email_lookup.sql の適用後に、SQL Editor へ貼り付けて実行するか `npx supabase db push` で適用する。
--
-- 原因:
--   auth.admin.inviteUserByEmail は招待メール送信時に auth.users へユーザーを作成するため、
--   handle_new_user トリガーがその時点で招待を使用済みにし、profiles (メンバー) を作成していた。
--
-- 修正後の仕様:
--   * 招待メールで作成されたユーザー (raw_user_meta_data.invitation_pending = true) は、
--     作成時には招待の有効性だけを確認し、メンバー登録しない (招待は「招待中」のまま)。
--   * 招待されたユーザーがメールのリンクを開き、ユーザー名とパスワードを設定して登録を完了した時点で
--     accept_my_invitation() によりメンバー登録し、招待を使用済みにする。
--   * サインアップ画面で招待コードを入力して登録する場合は、本人が登録操作を行うため従来どおり登録時に参加する。
--   * 招待メール送信済みで未参加のユーザー (auth.users にのみ存在) は、招待の取り消し・再送時にサーバーが削除する。
--   * 既に誤ってメンバー登録された未承認ユーザー (招待メールのリンクを一度も開いていない) は、
--     メンバーから外して招待中に戻す。

-- ============================================================
-- サインアップ時の処理
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

    -- 招待メールで作成されたユーザーは、本人が登録を完了するまでメンバーにしない
    if coalesce((meta ->> 'invitation_pending')::boolean, false) then
      return new;
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

-- 招待メールのリンクからログインしたユーザーが、ユーザー名を決めて組織に参加する。
-- メールのリンクを開いた (= メールアドレスを確認済み) ユーザーのみ参加できる。
-- 既にメンバーの場合はユーザー名の更新のみ行う (登録完了処理の再試行に備える)。
-- ユーザー名の重複は一意制約違反 (23505)、有効な招待がなければ P0002 になる。
create function public.accept_my_invitation(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_user  auth.users;
  v_name  text := left(btrim(coalesce(p_username, '')), 50);
  inv     public.organization_invitations;
begin
  if v_uid is null then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if v_name = '' then
    raise exception 'username is required' using errcode = '22023';
  end if;

  if exists (select 1 from public.profiles where id = v_uid) then
    update public.profiles set username = v_name, display_name = v_name where id = v_uid;
    return;
  end if;

  select * into v_user from auth.users where id = v_uid;
  if v_user.email_confirmed_at is null then
    raise exception 'email is not confirmed' using errcode = '42501';
  end if;

  -- 招待メールに付けた招待コードを優先し、なければ同じメールアドレスへの最新の招待を使う
  select * into inv
  from public.organization_invitations
  where lower(email) = lower(v_user.email)
    and accepted_at is null
    and expires_at > now()
  order by (token = coalesce(v_user.raw_user_meta_data ->> 'invitation_token', '')) desc,
           created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'invalid or expired invitation' using errcode = 'P0002';
  end if;

  insert into public.profiles (id, organization_id, username, display_name, email, role)
  values (v_uid, inv.organization_id, v_name, v_name, coalesce(v_user.email, ''), inv.role);

  update public.organization_invitations
  set accepted_at = now(), accepted_by = v_uid
  where id = inv.id;
end;
$$;

revoke execute on function public.accept_my_invitation(text) from public, anon;
grant execute on function public.accept_my_invitation(text) to authenticated;

-- 招待メールを送信済みで、まだ組織に参加していない (profiles がない) ユーザーの ID。
-- 招待の再送・取り消し時に、未参加のユーザーを削除するためにサーバー (service_role) からのみ呼ぶ。
create function public.find_unjoined_user(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(p_email)
    and not exists (select 1 from public.profiles p where p.id = u.id)
  limit 1;
$$;

revoke execute on function public.find_unjoined_user(text) from public, anon, authenticated;
grant execute on function public.find_unjoined_user(text) to service_role;

-- メールアドレスがいずれかの組織のメンバーとして登録済みか (招待前の確認用)。
create function public.is_email_member(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where lower(email) = lower(p_email));
$$;

revoke execute on function public.is_email_member(text) from public, anon, authenticated;
grant execute on function public.is_email_member(text) to service_role;

-- ============================================================
-- 既存の誤登録データ: 招待メールで作成され、まだリンクを開いていない (メール未確認・未ログイン) のに
-- メンバー登録されているユーザーを招待中に戻す
-- ============================================================
do $$
declare
  r record;
begin
  for r in
    select u.id as user_id, i.id as invitation_id
    from auth.users u
    join public.organization_invitations i on i.accepted_by = u.id
    where u.invited_at is not null
      and u.email_confirmed_at is null
      and u.last_sign_in_at is null
  loop
    -- 招待を未使用に戻す (期限を 7 日後まで延長する)。
    -- 同じメールアドレスへの新しい招待が既にあれば、そちらを残して古い招待は削除する。
    if exists (
      select 1
      from public.organization_invitations old_i
      join public.organization_invitations new_i
        on new_i.organization_id = old_i.organization_id
       and lower(new_i.email) = lower(old_i.email)
       and new_i.accepted_at is null
      where old_i.id = r.invitation_id
    ) then
      delete from public.organization_invitations where id = r.invitation_id;
    else
      update public.organization_invitations
      set accepted_at = null,
          accepted_by = null,
          expires_at = greatest(expires_at, now() + interval '7 days')
      where id = r.invitation_id;
    end if;

    delete from public.profiles where id = r.user_id;

    -- 以降は招待メールのリンクから登録を完了する
    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"invitation_pending": true}'::jsonb
    where id = r.user_id;
  end loop;
end;
$$;
