import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/app/lib/cn'

// Superficie y separaciones basadas en las tarjetas de TailAdmin Pro 2.4.
// Se mantiene section y la API Card/CardHeader/CardBody para no romper pantallas.
export default function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]', className)} {...props} />
}

export function CardHeader({ className, title, description, actions }: { className?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className={cn('flex flex-col gap-4 border-b border-gray-100 px-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 dark:border-gray-800', className)}>
    <div className="min-w-0 break-words">
      <h2 className="text-base font-medium text-gray-800 dark:text-white/90">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-0 p-4 sm:p-6', className)} {...props} />
}
