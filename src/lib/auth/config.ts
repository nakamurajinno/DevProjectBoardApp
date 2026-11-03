// モックリポジトリ使用時は認証もモック (Cookie に保存したデモアカウント) にする
export const isMockAuth = process.env.USE_MOCK_REPOSITORY === "true";
