import type { ReactNode } from 'react'
import { cn } from '@/app/lib/cn'

export default function DataTable({ columns, rows, caption, className }: { columns: string[]; rows: ReactNode[][]; caption?: string; className?: string }) {
  return <div className={cn('overflow-x-auto', className)}><table className="min-w-full text-left text-sm">
    {caption && <caption className="sr-only">{caption}</caption>}
    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400"><tr>{columns.map((column) => <th key={column} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{column}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index} className="border-b border-slate-100 last:border-0 dark:border-slate-800">{row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-4 py-4 text-slate-700 dark:text-slate-300">{cell}</td>)}</tr>)}</tbody>
  </table></div>
}
