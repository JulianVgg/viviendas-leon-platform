export default function DataTableContainer({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return <div className="overflow-x-auto">
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-4 py-3 font-medium">{column}</th>)}</tr>
      </thead>
      <tbody>{rows.map((row, index) => <tr key={index} className="border-b border-slate-100 last:border-0 dark:border-slate-800">{row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-4 py-4 text-slate-700 dark:text-slate-300">{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>
}
