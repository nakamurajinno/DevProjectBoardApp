export const TABLE_HEADERS = ["No.", "状況", "アプリ名", "概要", "SW区分", "登録者", "工数", ""];

export function ProjectTableHead() {
  return (
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-500">
        {TABLE_HEADERS.map((h, i) => (
          <th key={i} scope="col" className="px-4 py-3 text-center font-medium">
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}
