import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export default function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-8 text-center dark:border-gray-800 dark:bg-white/[0.02]">
    <span aria-hidden="true" className="mb-4 flex size-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"><Inbox className="size-5" /></span>
    <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{title}</h3>
    <p className="mt-1.5 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
}
