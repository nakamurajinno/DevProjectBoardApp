import { Suspense } from "react";
import { AddProjectButton } from "@/components/board/AddProjectButton";
import { DetailTabsReset } from "@/components/board/DetailTabs";
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
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-4 flex min-h-10 justify-end sm:mb-5">
          {/* 権限によって表示が変わるため Suspense で囲む */}
          <Suspense>
            <AddProjectButton />
          </Suspense>
        </div>
        {/* モバイルはカード一覧、デスクトップはテーブル (枠線・横スクロールは各表示側で持つ) */}
        <Suspense fallback={<ProjectTableSkeleton />}>
          <ProjectTable />
        </Suspense>
      </main>
      {children}
      {/* usePathname は実行時にしか決まらないため Suspense で囲む (何も描画しないので fallback 不要) */}
      <Suspense>
        <DetailTabsReset />
      </Suspense>
    </>
  );
}
