-- ユーザー名 → メールアドレスの解決をサーバー (service_role) 専用にする
-- 20261103300000_add_username_and_created_by.sql の適用後に、SQL Editor へ貼り付けて実行するか `npx supabase db push` で適用する。
--
-- anon キーはブラウザに公開されているため、anon / authenticated に実行権限があると
-- PostgREST (/rest/v1/rpc/get_login_email) を直接呼んでユーザー名からメールアドレスを取得できてしまう。
-- メールアドレスの取得は Next.js のサーバー (Server Action) から service_role キーでのみ行う。
--
-- サインアップ時のユーザー名の重複確認には、メールアドレスを返さない is_username_taken を使う
-- (ユーザー名は組織内で表示される公開情報のため、存在有無のみ返す)。

revoke execute on function public.get_login_email(text) from public, anon, authenticated;
grant execute on function public.get_login_email(text) to service_role;

create function public.is_username_taken(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where lower(username) = lower(btrim(p_username))
  );
$$;

revoke execute on function public.is_username_taken(text) from public;
grant execute on function public.is_username_taken(text) to anon, authenticated, service_role;
