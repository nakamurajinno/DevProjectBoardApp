"use client";

import { useParams, useRouter } from "next/navigation";
import { useProjectFilter } from "@/hooks/useProjectFilter";
import type { AssigneeOption, ProjectWithProgress } from "@/types";
import { ProjectCardList } from "./ProjectCardList";
import { ProjectDataTable } from "./ProjectDataTable";
import { ProjectSearchBar } from "./ProjectSearchBar";

function emptyMessage(canEdit: boolean, filtered: boolean) {
  if (filtered) return "該当するタスクが見つかりません。検索条件を変更してください。";
  return canEdit
    ? "プロジェクトがありません。「+ Add Project」から登録してください。"
    : "プロジェクトがありません。";
}

// 検索バーと一覧。lg 未満 (スマートフォン・タブレット) はカード一覧、lg 以上はテーブルで表示する。
// canEdit が false (参照ユーザー) のときは行の操作ボタン (活動ログ入力・編集・削除) を表示しない
export function ProjectTableView({
  projects,
  members,
  canEdit,
}: {
  projects: ProjectWithProgress[];
  members: AssigneeOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const { filter, setFilter, rows, total, isFiltered } = useProjectFilter(projects);

  const listProps = {
    rows,
    selectedId: params.id,
    canEdit,
    emptyMessage: emptyMessage(canEdit, isFiltered),
    onOpen: (id: string) => router.push(`/projects/${id}`),
  };

  return (
    <>
      <ProjectSearchBar
        filter={filter}
        onChange={setFilter}
        members={members}
        total={total}
        shown={rows.length}
      />
      <ProjectCardList {...listProps} />
      <ProjectDataTable {...listProps} />
    </>
  );
}
