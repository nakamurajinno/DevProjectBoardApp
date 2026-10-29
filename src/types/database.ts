// Supabase のテーブル型定義。
// スキーマ作成後に `npx supabase gen types typescript --project-id <id> > src/types/database.ts` で置き換える。
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
