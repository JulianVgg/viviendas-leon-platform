import type { ReactNode } from 'react'

export default function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-6 text-center dark:border-slate-700">
    <span aria-hidden="true" className="mb-3 flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">+</span>
    <h3 className="font-medium text-slate-800 dark:text-white">{title}</h3>
    <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
}
