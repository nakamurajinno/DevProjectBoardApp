// Supabase のテーブル型定義。
// supabase/migrations の SQL に合わせて手書きしている。スキーマ変更時は
// `npx supabase gen types typescript --project-id <id> > src/types/database.ts` で再生成してよい。
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          status: Database["public"]["Enums"]["project_status"];
          name: string;
          summary: string;
          category: Database["public"]["Enums"]["software_category"];
          planned_hours: number;
          tech_stack: string;
          links: Json;
          scope_step1: string;
          scope_step2: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          status?: Database["public"]["Enums"]["project_status"];
          name: string;
          summary?: string;
          category?: Database["public"]["Enums"]["software_category"];
          planned_hours?: number;
          tech_stack?: string;
          links?: Json;
          scope_step1?: string;
          scope_step2?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          status?: Database["public"]["Enums"]["project_status"];
          name?: string;
          summary?: string;
          category?: Database["public"]["Enums"]["software_category"];
          planned_hours?: number;
          tech_stack?: string;
          links?: Json;
          scope_step1?: string;
          scope_step2?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          project_id: string;
          worked_on: string;
          hours: number;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          worked_on: string;
          hours: number;
          content?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          worked_on?: string;
          hours?: number;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      projects_with_progress: {
        Row: Database["public"]["Tables"]["projects"]["Row"] & {
          actual_hours: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      project_status: "not_started" | "in_progress" | "done";
      software_category: "web" | "mobile" | "desktop" | "tool" | "other";
    };
    CompositeTypes: Record<string, never>;
  };
};
