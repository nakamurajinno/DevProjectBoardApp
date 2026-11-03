import type { ProjectStatus, ProjectWithProgress } from "@/types";

// 一覧の検索・絞り込み条件。各条件は AND で組み合わせる。
// assignee: "all" = 全員 / "unassigned" = 登録者なし / それ以外 = profiles.id
export type ProjectFilter = {
  keyword: string;
  status: ProjectStatus | "all";
  assignee: string;
};

export const ASSIGNEE_ALL = "all";
export const ASSIGNEE_UNASSIGNED = "unassigned";

export const EMPTY_FILTER: ProjectFilter = {
  keyword: "",
  status: "all",
  assignee: ASSIGNEE_ALL,
};

export function isFilterActive(filter: ProjectFilter) {
  return (
    filter.keyword.trim() !== "" ||
    filter.status !== EMPTY_FILTER.status ||
    filter.assignee !== EMPTY_FILTER.assignee
  );
}

// 表記ゆれを吸収した検索用文字列にする。
// NFKC で全角英数・半角カナを正規化し、小文字化し、カタカナをひらがなに寄せる。
function normalizeForSearch(text: string) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export function filterProjects(projects: ProjectWithProgress[], filter: ProjectFilter) {
  // 空白区切りの複数キーワードはすべて含むもの (AND) に一致させる
  const terms = normalizeForSearch(filter.keyword).split(/\s+/).filter(Boolean);

  return projects.filter((project) => {
    if (filter.status !== "all" && project.status !== filter.status) return false;

    if (filter.assignee === ASSIGNEE_UNASSIGNED) {
      if (project.created_by !== null) return false;
    } else if (filter.assignee !== ASSIGNEE_ALL && project.created_by !== filter.assignee) {
      return false;
    }

    if (terms.length > 0) {
      const haystack = normalizeForSearch(`${project.name}\n${project.summary}`);
      if (!terms.every((term) => haystack.includes(term))) return false;
    }
    return true;
  });
}
