-- 招待の作成を INSERT から UPSERT に変更する
-- 20261103500000_defer_invitation_acceptance.sql の適用後に、SQL Editor へ貼り付けて実行するか `npx supabase db push` で適用する。
--
-- 背景:
--   同じ組織・同じメールアドレスへの未使用の招待は一意インデックス
--   organization_invitations_pending_email_idx (organization_id, lower(email)) where accepted_at is null
--   により 1 件までに制限されている。従来は「削除 → INSERT」で作り直していたが、
--   削除に失敗した場合や、ダッシュボードで手動削除・復元したデータが残っている場合に一意制約違反 (23505) で失敗していた。
--   また、この一意インデックスは式・部分インデックスのため PostgREST の upsert (on_conflict) では指定できず、
--   招待テーブルには UPDATE の RLS ポリシーもないため、RPC で INSERT ... ON CONFLICT DO UPDATE を行う。

-- 招待を作成する。同じメールアドレスへの未使用の招待 (期限切れを含む) があれば、
-- ロール・招待コード・有効期限を更新して再利用する (古い招待コード・リンクは無効になる)。
-- 管理ユーザのみ実行可能。
create or replace function public.upsert_invitation(p_email text, p_role public.user_role)
returns public.organization_invitations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org   uuid := public.current_organization_id();
  v_email text := lower(btrim(coalesce(p_email, '')));
  inv     public.organization_invitations;
begin
  if auth.uid() is null or v_org is null or public.current_user_role() is distinct from 'admin' then
    raise exception 'only admins can invite members' using errcode = '42501';
  end if;

  insert into public.organization_invitations (organization_id, email, role, invited_by)
  values (v_org, v_email, coalesce(p_role, 'editor'), auth.uid())
  on conflict (organization_id, lower(email)) where accepted_at is null
  do update set
    email       = excluded.email,
    role        = excluded.role,
    invited_by  = excluded.invited_by,
    token       = replace(gen_random_uuid()::text, '-', ''),
    created_at  = now(),
    expires_at  = now() + interval '7 days',
    accepted_by = null
  returning * into inv;

  return inv;
end;
$$;

revoke execute on function public.upsert_invitation(text, public.user_role) from public, anon;
grant execute on function public.upsert_invitation(text, public.user_role) to authenticated;

-- メンバー判定は auth.users に実在するユーザーのプロフィールだけを対象にする
-- (ダッシュボードでの手動削除などで残ったプロフィールにより招待できなくなるのを防ぐ)。
create or replace function public.is_email_member(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where lower(p.email) = lower(p_email)
  );
$$;

revoke execute on function public.is_email_member(text) from public, anon, authenticated;
grant execute on function public.is_email_member(text) to service_role;
