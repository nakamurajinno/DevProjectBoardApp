import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/board/Header";
import {
  ProjectTable,
  ProjectTableSkeleton,
} from "@/components/board/ProjectTable";

// 一覧は常にこのレイアウトで表示し、詳細(ドロワー)・登録(モーダル)は
// 子ルート (children) として一覧の上に重ねる。
export default function BoardLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-4 flex justify-end">
          <Link
            href="/projects/new"
            scroll={false}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            <Plus className="size-4" aria-hidden />
            Add Project
          </Link>
        </div>
        <div className="overflow-x-auto">
          <Suspense fallback={<ProjectTableSkeleton />}>
            <ProjectTable />
          </Suspense>
        </div>
      </main>
      {children}
    </>
  );
}
