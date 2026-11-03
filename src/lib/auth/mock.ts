import type {
  AppUser,
  InvitationInfo,
  OrganizationMember,
  UserRole,
} from "@/types";

// USE_MOCK_REPOSITORY=true のとき (Supabase 未接続での UI 確認用) に使う、
// インメモリのアカウント・組織・招待。サーバープロセスが生きている間だけ保持される。
// デモアカウントのパスワードはすべて "password"。ログイン画面のプレビュー用ボタンからもログインできる。
// モックではメールは送信されないため、招待は招待コード (リンク) を共有して使う。
export const MOCK_SESSION_COOKIE = "pb_mock_session";
const MOCK_PASSWORD = "password";

export const MOCK_DEMO_ORG_ID = "org-demo";
export const MOCK_OTHER_ORG_ID = "org-other";

type MockOrganization = { id: string; name: string; created_at: string };
type MockAccount = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organizationId: string;
  created_at: string;
};
type MockInvitation = {
  id: string;
  organizationId: string;
  // ロール指定の招待リンクは null (どのメールアドレスでも登録できる)
  email: string | null;
  role: UserRole;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
};
type MockAuthStore = {
  organizations: MockOrganization[];
  accounts: MockAccount[];
  invitations: MockInvitation[];
};

const seed = (): MockAuthStore => ({
  organizations: [
    { id: MOCK_DEMO_ORG_ID, name: "デモ組織", created_at: "2026-10-01T00:00:00.000Z" },
    { id: MOCK_OTHER_ORG_ID, name: "別の組織", created_at: "2026-10-01T00:00:00.000Z" },
  ],
  accounts: (
    [
      { id: "u-admin", name: "管理ユーザー", email: "admin@example.com", role: "admin" },
      { id: "u-editor", name: "一般ユーザー", email: "editor@example.com", role: "editor" },
      { id: "u-viewer", name: "参照ユーザー", email: "viewer@example.com", role: "viewer" },
    ] satisfies Pick<MockAccount, "id" | "name" | "email" | "role">[]
  )
    .map((u): MockAccount => ({
      ...u,
      password: MOCK_PASSWORD,
      organizationId: MOCK_DEMO_ORG_ID,
      created_at: "2026-10-01T00:00:00.000Z",
    }))
    .concat({
      id: "u-other",
      name: "別組織ユーザー",
      email: "other@example.com",
      role: "admin",
      password: MOCK_PASSWORD,
      organizationId: MOCK_OTHER_ORG_ID,
      created_at: "2026-10-01T00:00:00.000Z",
    }),
  invitations: [],
});

const globalForMock = globalThis as unknown as { __mockAuthStore?: MockAuthStore };
const store = (globalForMock.__mockAuthStore ??= seed());

const sameEmail = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function mockPreviewAccounts() {
  return store.accounts
    .filter((a) => a.password === MOCK_PASSWORD && a.id.startsWith("u-"))
    .map(({ id, email, role, organizationId }) => ({
      id,
      email,
      role,
      organizationName: findOrg(organizationId)?.name ?? "",
    }));
}

function findOrg(id: string) {
  return store.organizations.find((o) => o.id === id);
}

export function findMockUser(id: string | undefined): AppUser | null {
  if (!id) return null;
  const account = store.accounts.find((a) => a.id === id);
  if (!account) return null;
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    organizationId: account.organizationId,
    organizationName: findOrg(account.organizationId)?.name ?? "",
  };
}

function mockEmailExists(email: string) {
  return store.accounts.some((a) => sameEmail(a.email, email));
}

// ユーザー名 (大文字小文字を区別しない) からメールアドレスを引く
export function mockFindEmailByUsername(username: string): string | null {
  const account = store.accounts.find((a) => a.name.toLowerCase() === username.toLowerCase());
  return account?.email ?? null;
}

export function mockUsernameExists(username: string) {
  return mockFindEmailByUsername(username) !== null;
}

export function mockAuthenticate(
  email: string,
  password: string,
): { ok: true; id: string } | { ok: false; reason: "not_found" | "wrong_password" } {
  const account = store.accounts.find((a) => sameEmail(a.email, email));
  if (!account) return { ok: false, reason: "not_found" };
  if (account.password !== password) return { ok: false, reason: "wrong_password" };
  return { ok: true, id: account.id };
}

// 現在のパスワードが正しければ新しいパスワードに変更する
export function mockChangePassword(userId: string, currentPassword: string, newPassword: string) {
  const account = store.accounts.find((a) => a.id === userId);
  if (!account || account.password !== currentPassword) return false;
  account.password = newPassword;
  return true;
}

// ユーザー名を変更する。他のユーザーが使用中 (大文字小文字を区別しない) なら false
export function mockChangeUsername(userId: string, username: string) {
  const account = store.accounts.find((a) => a.id === userId);
  if (!account) return false;
  const taken = store.accounts.some(
    (a) => a.id !== userId && a.name.toLowerCase() === username.toLowerCase(),
  );
  if (taken) return false;
  account.name = username;
  return true;
}

function findPendingInvitation(token: string) {
  return store.invitations.find(
    (i) => i.token === token && !i.accepted_at && new Date(i.expires_at) > new Date(),
  );
}

export function mockGetInvitation(token: string): InvitationInfo | null {
  const invitation = findPendingInvitation(token);
  if (!invitation) return null;
  return {
    organizationName: findOrg(invitation.organizationId)?.name ?? "",
    email: invitation.email,
    role: invitation.role,
  };
}

// 組織作成 (organizationName) または招待 (invitationToken) のどちらかで登録する
export function mockSignUp(input: {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
  invitationToken?: string;
}): { ok: true; id: string } | { ok: false; message: string } {
  if (mockEmailExists(input.email))
    return { ok: false, message: "このメールアドレスは既に登録されています。ログインしてください" };

  const now = new Date().toISOString();
  let organizationId: string;
  let role: UserRole;
  if (input.invitationToken) {
    const invitation = findPendingInvitation(input.invitationToken);
    if (!invitation || (invitation.email && !sameEmail(invitation.email, input.email)))
      return { ok: false, message: "招待コードが無効か、有効期限が切れています" };
    invitation.accepted_at = now;
    organizationId = invitation.organizationId;
    role = invitation.role;
  } else if (input.organizationName) {
    organizationId = crypto.randomUUID();
    store.organizations.push({ id: organizationId, name: input.organizationName, created_at: now });
    role = "admin";
  } else {
    return { ok: false, message: "組織を作成するか、招待コードを入力してください" };
  }

  const id = crypto.randomUUID();
  store.accounts.push({
    id,
    name: input.name,
    email: input.email,
    password: input.password,
    role,
    organizationId,
    created_at: now,
  });
  return { ok: true, id };
}

export function mockListMembers(organizationId: string): OrganizationMember[] {
  return store.accounts
    .filter((a) => a.organizationId === organizationId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(({ id, name, email, role, created_at }) => ({ id, name, email, role, created_at }));
}

// ロールを指定した招待リンク (1 回のみ使用可・7 日間有効) を作成し、招待コードを返す
export function mockCreateInvitation(organizationId: string, role: UserRole) {
  const now = new Date();
  const invitation: MockInvitation = {
    id: crypto.randomUUID(),
    organizationId,
    email: null,
    role,
    token: crypto.randomUUID().replaceAll("-", ""),
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    accepted_at: null,
  };
  store.invitations.push(invitation);
  return invitation.token;
}

// メンバーを組織から除外する (モックではアカウントごと削除する)。失敗時はエラーメッセージを返す
export function mockRemoveMember(organizationId: string, userId: string): string | null {
  const index = store.accounts.findIndex((a) => a.id === userId && a.organizationId === organizationId);
  if (index === -1) return "メンバーが見つかりません";
  const account = store.accounts[index];
  const otherAdmins = store.accounts.some(
    (a) => a.organizationId === organizationId && a.role === "admin" && a.id !== userId,
  );
  if (account.role === "admin" && !otherAdmins) return "組織には管理ユーザーが 1 人以上必要です";
  store.accounts.splice(index, 1);
  return null;
}

export function mockSetMemberRole(
  organizationId: string,
  userId: string,
  role: UserRole,
): string | null {
  const account = store.accounts.find(
    (a) => a.id === userId && a.organizationId === organizationId,
  );
  if (!account) return "メンバーが見つかりません";
  const otherAdmins = store.accounts.some(
    (a) => a.organizationId === organizationId && a.role === "admin" && a.id !== userId,
  );
  if (role !== "admin" && !otherAdmins) return "組織には管理ユーザーが 1 人以上必要です";
  account.role = role;
  return null;
}
