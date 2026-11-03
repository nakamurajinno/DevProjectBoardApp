-- ユーザー名の長さ制限を「全角 10 文字 (半角 20 文字)」にする
-- SQL Editor へ貼り付けて実行するか `npx supabase db push` で適用する。
--
-- 仕様:
--   * 長さは表示幅で数える。半角 (ASCII の表示可能文字・半角カタカナ) は 1、それ以外 (全角) は 2 として 20 まで。
--     アプリ側の usernameWidth (src/lib/validation/auth.ts) と同じ数え方。
--   * 自動で作るユーザー名 (unique_username: 表示名・メールアドレスから作る名前) も 20 に収める。
--   * 既存のユーザー名で 20 を超えるものは、重複しないよう切り詰めてから制約を付け替える。

-- 表示幅 (半角 1・全角 2)
create function public.username_width(p_name text)
returns int
language sql
immutable
set search_path = ''
as $$
  select char_length(p_name)
       + char_length(regexp_replace(p_name, '[ -~｡-ﾟ]', '', 'g'));
$$;

-- 表示幅が p_max 以下になるよう末尾を切り詰める
create function public.truncate_by_width(p_name text, p_max int)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  result text := '';
  ch     text;
begin
  foreach ch in array regexp_split_to_array(coalesce(p_name, ''), '')
  loop
    exit when public.username_width(result || ch) > p_max;
    result := result || ch;
  end loop;
  return result;
end;
$$;

-- 重複しないユーザー名を作る (2 人目以降は末尾に番号を付ける)。番号を含めて幅 20 に収める
create or replace function public.unique_username(p_base text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  base      text := nullif(btrim(replace(coalesce(p_base, ''), '@', '')), '');
  candidate text;
  n         int  := 1;
begin
  base := coalesce(base, 'user');
  candidate := btrim(public.truncate_by_width(base, 20));
  while candidate = '' or exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
    n := n + 1;
    candidate := btrim(public.truncate_by_width(base, 20 - char_length(n::text))) || n;
  end loop;
  return candidate;
end;
$$;

revoke execute on function public.unique_username(text) from public, anon, authenticated;

-- 既存の長すぎるユーザー名を切り詰める
do $$
declare
  r record;
  v_name text;
begin
  for r in select id, username from public.profiles where public.username_width(username) > 20 loop
    v_name := public.unique_username(r.username);
    update public.profiles set username = v_name, display_name = v_name where id = r.id;
  end loop;
end;
$$;

alter table public.profiles
  drop constraint profiles_username_check,
  add constraint profiles_username_check
    check (
      char_length(username) >= 1
      and public.username_width(username) <= 20
      and username = btrim(username)
      and position('@' in username) = 0
    );
