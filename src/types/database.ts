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
          organization_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string;
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
          organization_id?: string;
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
          organization_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          organization_id?: string;
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
          organization_id?: string;
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
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          display_name: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          display_name?: string;
          email?: string;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          display_name?: string;
          email?: string;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          token: string;
          invited_by: string | null;
          created_at: string;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id?: string;
          email: string;
          role?: Database["public"]["Enums"]["user_role"];
          token?: string;
          invited_by?: string | null;
          created_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: Database["public"]["Enums"]["user_role"];
          token?: string;
          invited_by?: string | null;
          created_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
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
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      current_organization_id: { Args: Record<string, never>; Returns: string };
      can_edit: { Args: Record<string, never>; Returns: boolean };
      get_invitation: {
        Args: { p_token: string };
        Returns: {
          organization_name: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          expires_at: string;
        }[];
      };
      is_email_registered: { Args: { p_email: string }; Returns: boolean };
      set_member_role: {
        Args: { p_user_id: string; p_role: Database["public"]["Enums"]["user_role"] };
        Returns: undefined;
      };
      update_my_display_name: { Args: { p_display_name: string }; Returns: undefined };
    };
    Enums: {
      project_status: "not_started" | "in_progress" | "done";
      software_category: "web" | "mobile" | "desktop" | "tool" | "other";
      user_role: "viewer" | "editor" | "admin";
    };
    CompositeTypes: Record<string, never>;
  };
};
