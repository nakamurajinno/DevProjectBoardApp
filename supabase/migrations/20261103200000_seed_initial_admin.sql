-- 初期管理者ユーザー・初期組織の作成と、既存データの移行
-- 20261103100000_add_organizations.sql の適用後に、SQL Editor へ貼り付けて実行するか `npx supabase db push` で適用する。
-- 何度実行しても同じ結果になる (ユーザーが既に存在する場合は作成をスキップする)。
--
--   * nakamura.jinno@gmail.com (パスワード: password) を auth.users に作成する (メール確認済み)。
--     handle_new_user トリガーが raw_user_meta_data.organization_name から組織を作成し、管理者 (admin) にする。
--   * 既存のすべての projects / activity_logs をその組織に割り当てる。
--   * データもメンバーもいなくなった組織 (20261103100000 で作られた「マイ組織」など) は削除する。
--
-- ※ 適用後はログイン画面からパスワードを変更すること。

do $$
declare
  v_email    constant text := 'nakamura.jinno@gmail.com';
  v_password constant text := 'password';
  v_org_name constant text := 'Jinno''s Organization';
  v_user_id  uuid;
  v_org_id   uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower(v_email);

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    -- GoTrue は文字列のトークン列が NULL だとログインに失敗するため、空文字で埋める
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('organization_name', v_org_name, 'display_name', split_part(v_email, '@', 1)),
      now(), now(),
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id, v_user_id::text, 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );
  end if;

  select organization_id into v_org_id from public.profiles where id = v_user_id;
  if v_org_id is null then
    raise exception 'profile for % was not created', v_email;
  end if;

  update public.organizations set name = v_org_name where id = v_org_id;
  update public.profiles set role = 'admin' where id = v_user_id;

  -- 既存データを初期組織へ一括で割り当てる
  update public.projects set organization_id = v_org_id
  where organization_id is distinct from v_org_id;
  update public.activity_logs set organization_id = v_org_id
  where organization_id is distinct from v_org_id;

  -- メンバーもプロジェクトもいない組織を削除する
  delete from public.organizations o
  where o.id <> v_org_id
    and not exists (select 1 from public.profiles p where p.organization_id = o.id)
    and not exists (select 1 from public.projects p where p.organization_id = o.id);
end;
$$;
