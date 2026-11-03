import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell, authLinkClass } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";
import { getInvitationInfo } from "@/lib/data/organization";
import { extractInvitationToken } from "@/lib/validation/auth";

export const metadata: Metadata = {
  title: "新規ユーザー登録 | 個人開発プロジェクト管理ボード",
};

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <AuthShell
      wide
      subtitle="新規ユーザー登録"
      footer={
        <>
          アカウントをお持ちの方は{" "}
          <Link href="/login" className={authLinkClass}>
            ログイン
          </Link>
        </>
      }
    >
      {/* 招待リンク (?invite=<招待コード>) はリクエスト時にしか決まらないため Suspense で囲む */}
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-slate-50" />}>
        <Signup searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Signup({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const { invite } = await searchParams;
  const token = typeof invite === "string" ? extractInvitationToken(invite.trim()) : "";
  const invitation = token ? await getInvitationInfo(token) : null;
  return <SignupForm initialToken={token} invitation={invitation} />;
}
