import type { HTMLAttributes } from 'react'
import { cn } from '@/app/lib/cn'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

export default function Alert({ title, variant = 'info', className, children, ...props }: HTMLAttributes<HTMLDivElement> & { title?: string; variant?: AlertVariant }) {
  return <div role={variant === 'error' ? 'alert' : 'status'} className={cn('rounded-xl border p-4 text-sm', variant === 'info' && 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200', variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200', variant === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200', variant === 'error' && 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200', className)} {...props}>{title && <p className="font-medium">{title}</p>}{children && <div className={cn(title && 'mt-1')}>{children}</div>}</div>
}
