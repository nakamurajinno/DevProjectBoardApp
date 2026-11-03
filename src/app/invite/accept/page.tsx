import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { InviteAccept } from "@/components/auth/InviteAccept";
import { getCurrentUser } from "@/lib/auth/session";
import { getPendingInvitee } from "@/lib/data/organization";

export const metadata: Metadata = {
  title: "招待の受諾 | 個人開発プロジェクト管理ボード",
};

// 招待メールのリンクの戻り先。パスワードとユーザー名を設定して登録を完了する。
export default function InviteAcceptPage({ searchParams }: PageProps<"/invite/accept">) {
  return (
    <AuthShell subtitle="招待された組織に参加する">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-slate-50" />}>
        <Accept searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Accept({
  searchParams,
}: {
  searchParams: PageProps<"/invite/accept">["searchParams"];
}) {
  const [{ error }, user] = await Promise.all([searchParams, getCurrentUser()]);
  // /auth/confirm (token_hash 形式のリンク) を経由した場合はログイン済み (未参加) で表示される
  const invitee = user
    ? { email: user.email ?? "", name: user.name, organizationName: user.organizationName }
    : await getPendingInvitee();
  return <InviteAccept linkError={typeof error === "string"} currentUser={invitee} />;
}
