import type { HTMLAttributes } from 'react'
import { cn } from '@/app/lib/cn'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

export default function Alert({ title, variant = 'info', className, children, ...props }: HTMLAttributes<HTMLDivElement> & { title?: string; variant?: AlertVariant }) {
  return <div role={variant === 'error' ? 'alert' : 'status'} className={cn(
    'flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 shadow-theme-xs',
    variant === 'info' && 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100',
    variant === 'success' && 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    variant === 'warning' && 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    variant === 'error' && 'border-red-300 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
    className,
  )} {...props}>
    <svg aria-hidden="true" className="mt-0.5 size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {variant === 'warning' ? <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v4m0 4h.01" /></> : <><circle cx="12" cy="12" r="9" />{variant === 'success' ? <path d="m8 12 3 3 5-6" /> : variant === 'error' ? <path d="M12 7v6m0 4h.01" /> : <path d="M12 11v6m0-10h.01" />}</>}
    </svg>
    <div className="min-w-0 flex-1 break-words">{title && <p className="font-semibold">{title}</p>}{children != null && <div className={cn(title && 'mt-1')}>{children}</div>}</div>
  </div>
}
