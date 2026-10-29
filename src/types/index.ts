// アプリ全体で使うドメイン型
export type TaskStatus = "todo" | "in_progress" | "done";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  created_at: string;
};
