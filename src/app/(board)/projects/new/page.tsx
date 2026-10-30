import { ProjectCreateForm } from "@/components/board/ProjectCreateForm";
import { Modal } from "@/components/ui/Overlay";

export default function NewProjectPage() {
  return (
    <Modal title="プロジェクト登録">
      <ProjectCreateForm />
    </Modal>
  );
}
