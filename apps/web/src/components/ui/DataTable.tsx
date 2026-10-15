import type { ReactNode } from 'react'
import { cn } from '@/app/lib/cn'

// Datos, columnas y orden permanecen sin modificación. Solo presentación TailAdmin.
export default function DataTable({ columns, rows, caption, className }: { columns: string[]; rows: ReactNode[][]; caption?: string; className?: string }) {
  return <div tabIndex={0} role="region" aria-label={caption || 'Tabla de datos'} className={cn('custom-scrollbar max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 dark:border-gray-800 dark:bg-white/[0.03]', className)}>
    <table className="min-w-full text-start text-sm">
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead className="border-b border-gray-200 bg-gray-50 text-theme-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
        <tr>{columns.map((column) => <th key={column} scope="col" className="whitespace-nowrap border-b border-gray-200 px-5 py-3.5 text-start font-medium dark:border-gray-800">{column}</th>)}</tr>
      </thead>
      <tbody>{rows.map((row, index) => <tr key={index} className="border-b border-gray-100 transition-colors duration-150 last:border-0 hover:bg-gray-50 focus-within:bg-gray-50 motion-reduce:transition-none dark:border-gray-800 dark:hover:bg-white/5 dark:focus-within:bg-white/5">{row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-5 py-4 text-gray-700 dark:text-gray-300">{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>
}
