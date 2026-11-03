import { ArrowLeft, Building2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/board/Header";
import { RoleBadge } from "@/components/board/RoleBadge";
import { InvitationList } from "@/components/organization/InvitationList";
import { InviteMemberForm } from "@/components/organization/InviteMemberForm";
import { MemberList } from "@/components/organization/MemberList";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembers, getPendingInvitations } from "@/lib/data/organization";

export const metadata: Metadata = {
  title: "組織・メンバー | 個人開発プロジェクト管理ボード",
};

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
  const [members, invitations] = await Promise.all([getMembers(), getPendingInvitations()]);

  return (
    <>
      <section className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
          <Building2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">所属組織</p>
          <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">
            {user.organizationName}
          </h2>
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs text-slate-500">あなたの権限</p>
          <RoleBadge role={user.role} />
        </div>
      </section>

      {admin && (
        <Section
          title="メンバーを招待"
          description="既存の組織への参加には招待が必要です。招待されたユーザーはメール内のリンク（または招待コード）からアカウント登録すると、この組織に自動で所属します。"
        >
          <InviteMemberForm />
        </Section>
      )}

      <Section title={`メンバー（${members.length}人）`}>
        <MemberList members={members} currentUserId={user.id} editable={admin} />
      </Section>

      {admin && (
        <Section title="招待中" description="まだ登録が完了していない招待です。招待リンクは 7 日間有効です。">
          <InvitationList invitations={invitations} />
        </Section>
      )}
    </>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
