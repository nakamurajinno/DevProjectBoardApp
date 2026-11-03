import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/board/Header";
import { InviteMemberForm } from "@/components/organization/InviteMemberForm";
import { MemberList } from "@/components/organization/MemberList";
import { OrganizationSection } from "@/components/organization/OrganizationSection";
import { OrganizationSummary } from "@/components/organization/OrganizationSummary";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembers } from "@/lib/data/organization";

export const metadata: Metadata = {
  title: "組織・メンバー | 個人開発プロジェクト管理ボード",
};

const INVITE_DESCRIPTION =
  "ロールを選んで招待リンクを発行し、招待したい相手に共有してください。リンクを開いたユーザーがメールアドレス・ユーザー名・パスワードを入力してアカウント登録すると、選択したロールでこの組織に自動で所属します。招待リンクは 1 回のみ使用でき、有効期限は 7 日間です。";

export default function OrganizationPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          プロジェクト一覧へ戻る
        </Link>
        {/* ログインユーザー・組織のデータはリクエスト時にしか決まらないため Suspense で囲む */}
        <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-slate-100" />}>
          <OrganizationContent />
        </Suspense>
      </main>
    </>
  );
}

async function OrganizationContent() {
  const user = await getCurrentUser();
  if (!user) return null;
  const admin = isAdmin(user.role);
  const members = await getMembers();

  return (
    <>
      <OrganizationSummary user={user} />

      {admin && (
        <OrganizationSection title="メンバーを招待" description={INVITE_DESCRIPTION}>
          <InviteMemberForm />
        </OrganizationSection>
      )}

      <OrganizationSection title={`メンバー（${members.length}人）`}>
        <MemberList members={members} currentUserId={user.id} editable={admin} />
      </OrganizationSection>
    </>
  );
}
