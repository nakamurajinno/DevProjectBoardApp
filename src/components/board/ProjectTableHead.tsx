export const TABLE_HEADERS = ["No.", "状況", "アプリ名", "概要", "SW区分", "工数", ""];

export function ProjectTableHead() {
  return (
    <thead>
      <tr className="border-b-2 border-gray-900 text-sm">
        {TABLE_HEADERS.map((h, i) => (
          <th key={i} scope="col" className="px-3 py-3 text-center font-normal">
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}
