-- 招待をメールアドレス指定から「ロール指定の汎用招待リンク」に変更する
-- 20261103600000_upsert_invitation.sql の適用後に、SQL Editor へ貼り付けて実行するか `npx supabase db push` で適用する。
--
-- 変更後の仕様:
--   * 管理ユーザはロール (参照ユーザ / 一般ユーザ / 管理ユーザ) だけを指定して招待リンクを発行する。
--     organization_invitations.email は null (特定のメールアドレスに紐づかない)。
--   * 招待リンク (/signup?invite=<token>) を開いたユーザーは任意のメールアドレスで登録でき、
--     handle_new_user トリガーにより招待のロールで組織のメンバーになる。
--   * 招待リンクは 1 回使うと使用済み (accepted_at) になる。有効期限は発行から 7 日。
--   * 従来のメールアドレス指定の招待 (email が null でないもの) は、引き続きそのメールアドレスでのみ使える。

alter table public.organization_invitations
  alter column email drop not null;

-- メールアドレス指定の招待を作り直すための RPC は不要になったため削除する
drop function if exists public.upsert_invitation(text, public.user_role);

-- ============================================================
-- サインアップ時の処理: メールアドレス未指定の招待は、どのメールアドレスでも使える
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
      and (email is null or lower(email) = lower(new.email))
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
