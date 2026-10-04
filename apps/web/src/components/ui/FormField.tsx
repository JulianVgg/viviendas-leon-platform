import type { ReactNode } from 'react'
import { cn } from '@/app/lib/cn'

export default function FormField({ label, id, hint, error, required, children }: { label: string; id?: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}{required && <span aria-hidden="true" className="ms-1 text-red-600">*</span>}</label>
    {children}
    {error ? <p id={id ? `${id}-error` : undefined} role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
  </div>
}

// oxlint-disable-next-line react/only-export-components
export const formControlClassName = cn('h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800')
