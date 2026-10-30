-- 動作確認用のサンプルデータ (任意)。マイグレーション適用後に実行する。

insert into public.projects
  (id, status, name, summary, category, planned_hours, tech_stack, links, scope_step1, scope_step2)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'in_progress',
    '個人開発進捗管理アプリ',
    '個人開発における進捗管理を行うWebアプリケーション',
    'web',
    30,
    'Next.js/Supabase/Vercel',
    '[
      {"id": "8b0b7c1e-0000-4000-8000-000000000001", "label": "UI設計書", "url": "https://example.com/ui-spec"},
      {"id": "8b0b7c1e-0000-4000-8000-000000000002", "label": "Github", "url": "https://github.com/"}
    ]'::jsonb,
    E'・一覧画面\n・詳細画面（参照、登録）',
    E'・日報入力/参照\n・ユーザー/グループ認証'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'not_started',
    '家計簿スマホアプリ',
    'レシート撮影で支出を自動記録する家計簿アプリ',
    'mobile',
    50,
    'React Native/Expo/Supabase',
    '[]'::jsonb,
    E'・支出登録\n・月次グラフ',
    '・レシートOCR'
  );

insert into public.activity_logs (project_id, worked_on, hours, content)
values
  ('00000000-0000-0000-0000-000000000001', '2026-10-28', 2,   E'・●●機能実装\n・▲▲機能不具合修正'),
  ('00000000-0000-0000-0000-000000000001', '2026-10-07', 0.5, '・■■機能実装'),
  ('00000000-0000-0000-0000-000000000001', '2026-10-04', 2.5, '・▲▲機能実装');
