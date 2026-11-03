-- 管理者によるメンバーの組織からの除外
-- SQL Editor へ貼り付けて実行するか `npx supabase db push` で適用する。
--
-- 仕様:
--   * ユーザーは 1 つの組織にのみ所属し、所属は profiles 行で表す (organization_id)。
--     除外は profiles 行の削除で行う。担当したプロジェクト・活動記録は組織に残る (created_by は null になる)。
--   * 管理者のみ実行できる。自分自身・組織の最後の管理者は除外できない。
--   * 除外後に残る auth.users のアカウントは、サーバー (service_role) が find_unjoined_user で探して削除する
--     (同じメールアドレスで再度招待できるようにするため)。

create function public.remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid := public.current_organization_id();
  target_role public.user_role;
begin
  if org_id is null or public.current_user_role() is distinct from 'admin' then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'cannot remove yourself' using errcode = 'P0001';
  end if;

  -- 同時変更で管理者が 0 人にならないよう、組織のメンバー行をロックする
  perform 1 from public.profiles where organization_id = org_id for update;

  select role into target_role
  from public.profiles
  where id = p_user_id and organization_id = org_id;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;

  if target_role = 'admin' and not exists (
    select 1 from public.profiles
    where organization_id = org_id and role = 'admin' and id <> p_user_id
  ) then
    raise exception 'organization must have at least one admin' using errcode = 'P0001';
  end if;

  delete from public.profiles where id = p_user_id;
end;
$$;

revoke execute on function public.remove_member(uuid) from public, anon;
grant execute on function public.remove_member(uuid) to authenticated;
