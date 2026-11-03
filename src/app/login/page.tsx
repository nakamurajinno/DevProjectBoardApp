import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell, authLinkClass } from "@/components/auth/AuthShell";
import { LoginErrorFromQuery, LoginForm } from "@/components/auth/LoginForm";
import { isMockAuth } from "@/lib/auth/config";
import { mockPreviewAccounts } from "@/lib/auth/mock";

export const metadata: Metadata = {
  title: "ログイン | 個人開発プロジェクト管理ボード",
};

export default function LoginPage() {
  const previewAccounts = isMockAuth ? mockPreviewAccounts() : undefined;

  return (
    <AuthShell
      subtitle="アカウントにログインして続ける"
      footer={
        <>
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className={authLinkClass}>
            新規ユーザー登録
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginErrorFromQuery />
      </Suspense>
      <LoginForm previewAccounts={previewAccounts} />
    </AuthShell>
  );
}
