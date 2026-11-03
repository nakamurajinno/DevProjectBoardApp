import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { canEdit } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

// 編集権限があれば「Add Project」、参照ユーザなら読み取り専用である旨を表示する
export async function AddProjectButton() {
  const user = await getCurrentUser();
  if (!canEdit(user?.role)) {
    return (
      <p className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
        <Eye className="size-4" aria-hidden />
        参照ユーザの権限のため、追加・編集・削除はできません
      </p>
    );
  }
  return (
    <Link
      href="/projects/new"
      scroll={false}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
    >
      <Plus className="size-4" aria-hidden />
      Add Project
    </Link>
  );
}
