export function DrawerLoading() {
  return (
    <div className="space-y-4 px-5 py-16" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export function DrawerNotFound() {
  return (
    <p className="px-5 py-16 text-center text-sm text-gray-500">
      プロジェクトが見つかりませんでした。
    </p>
  );
}
