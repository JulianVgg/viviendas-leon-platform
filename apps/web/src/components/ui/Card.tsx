import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/app/lib/cn'

export default function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-theme-xs dark:border-slate-800 dark:bg-slate-900', className)} {...props} />
}

export function CardHeader({ className, title, description, actions }: { className?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className={cn('flex flex-col gap-4 border-b border-slate-100 px-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 dark:border-slate-800', className)}>
    <div className="min-w-0 break-words"><h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}</div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-0 p-4 sm:p-6', className)} {...props} />
}
