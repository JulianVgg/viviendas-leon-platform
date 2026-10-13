import type { ReactNode } from 'react'
import { cn } from '@/app/lib/cn'

export default function DataTable({ columns, rows, caption, className }: { columns: string[]; rows: ReactNode[][]; caption?: string; className?: string }) {
  return <div tabIndex={0} role="region" aria-label={caption || 'Tabla de datos'} className={cn('custom-scrollbar max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 dark:border-slate-800 dark:bg-slate-900', className)}><table className="min-w-full text-start text-sm">
    {caption && <caption className="sr-only">{caption}</caption>}
    <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600 dark:border-slate-800 dark:bg-white/5 dark:text-slate-400"><tr>{columns.map((column) => <th key={column} scope="col" className="whitespace-nowrap px-5 py-3 text-start font-medium">{column}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 focus-within:bg-slate-50 motion-reduce:transition-none dark:border-slate-800 dark:hover:bg-white/5 dark:focus-within:bg-white/5">{row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-5 py-4 text-slate-700 dark:text-slate-300">{cell}</td>)}</tr>)}</tbody>
  </table></div>
}
