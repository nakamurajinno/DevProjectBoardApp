-- 個人開発プロジェクト・活動ログのテーブル定義
-- Supabase の SQL Editor に貼り付けて実行するか、`npx supabase db push` で適用する。

-- ============================================================
-- 列挙型 (src/types/index.ts の ProjectStatus / SoftwareCategory と一致させる)
-- ============================================================
create type public.project_status as enum ('not_started', 'in_progress', 'done');

create type public.software_category as enum ('web', 'mobile', 'desktop', 'tool', 'other');

-- ============================================================
-- projects: 開発プロジェクト
-- ============================================================
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  status        public.project_status    not null default 'not_started',
  name          text                     not null check (char_length(name) between 1 and 100),
  summary       text                     not null default '' check (char_length(summary) <= 1000),
  category      public.software_category not null default 'web',
  planned_hours numeric(7, 2)            not null default 0 check (planned_hours >= 0),
  tech_stack    text                     not null default '',
  -- 関連リンク。常にプロジェクトと一緒に読み書きするため jsonb 配列で保持する。
  -- 形式: [{ "id": "<uuid>", "label": "...", "url": "https://..." }, ...]
  links         jsonb                    not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  scope_step1   text                     not null default '',
  scope_step2   text                     not null default '',
  created_at    timestamptz              not null default now(),
  updated_at    timestamptz              not null default now()
);

create index projects_created_at_idx on public.projects (created_at);

-- ============================================================
-- activity_logs: 作業日ごとの活動ログ (実績工数の元データ)
-- ============================================================
create table public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid          not null references public.projects (id) on delete cascade,
  worked_on  date          not null,
  hours      numeric(5, 2) not null check (hours >= 0),
  content    text          not null default '',
  created_at timestamptz   not null default now()
);

create index activity_logs_project_id_worked_on_idx
  on public.activity_logs (project_id, worked_on desc);

-- ============================================================
-- updated_at の自動更新
-- ============================================================
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ============================================================
-- projects_with_progress: 実績工数 (活動ログの合計) 付きのプロジェクト
-- security_invoker により、参照元テーブルの RLS が呼び出しユーザーで適用される。
-- ============================================================
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
-- Row Level Security
-- 認証機能 (STEP2) 実装までは anon キーで全操作を許可する暫定ポリシー。
-- 認証導入時に user_id 列を追加し、auth.uid() で絞り込むポリシーに置き換えること。
-- ============================================================
alter table public.projects enable row level security;
alter table public.activity_logs enable row level security;

create policy "暫定: 全ユーザーに全操作を許可" on public.projects
  for all to anon, authenticated using (true) with check (true);

create policy "暫定: 全ユーザーに全操作を許可" on public.activity_logs
  for all to anon, authenticated using (true) with check (true);
