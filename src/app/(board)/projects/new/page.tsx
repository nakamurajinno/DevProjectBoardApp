import { Suspense } from "react";
import { ProjectCreateForm } from "@/components/board/ProjectCreateForm";
import { Modal } from "@/components/ui/Overlay";
import { canEdit } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

export default function NewProjectPage() {
  return (
    <Modal title="プロジェクト登録">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-slate-50" />}>
        <NewProjectForm />
      </Suspense>
    </Modal>
  );
}

// URL を直接開いた場合も、参照ユーザーの権限では登録フォームを表示しない
async function NewProjectForm() {
  const user = await getCurrentUser();
  if (!canEdit(user?.role)) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        参照ユーザーの権限のため、プロジェクトを登録できません。
      </p>
    );
  }
  return <ProjectCreateForm />;
}
