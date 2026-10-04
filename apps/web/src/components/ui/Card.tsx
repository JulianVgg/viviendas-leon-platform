import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/app/lib/cn'

export default function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900', className)} {...props} />
}

export function CardHeader({ className, title, description, actions }: { className?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className={cn('flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800', className)}>
    <div><h2 className="font-medium text-slate-900 dark:text-white">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}</div>
    {actions && <div className="shrink-0">{actions}</div>}
  </div>
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}
