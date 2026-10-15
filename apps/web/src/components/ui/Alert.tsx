import type { HTMLAttributes } from 'react'
import { cn } from '@/app/lib/cn'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

export default function Alert({ title, variant = 'info', className, children, ...props }: HTMLAttributes<HTMLDivElement> & { title?: string; variant?: AlertVariant }) {
  return <div role={variant === 'error' ? 'alert' : 'status'} className={cn(
    'flex items-start gap-3 rounded-xl border p-4 text-sm leading-6',
    variant === 'info' && 'border-blue-light-300 bg-blue-light-50 dark:border-blue-light-500/30 dark:bg-blue-light-500/10',
    variant === 'success' && 'border-success-300 bg-success-50 dark:border-success-500/30 dark:bg-success-500/10',
    variant === 'warning' && 'border-warning-300 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/10',
    variant === 'error' && 'border-error-300 bg-error-50 dark:border-error-500/30 dark:bg-error-500/10',
    className,
  )} {...props}>
    <svg aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0',
      variant === 'info' && 'text-blue-light-600 dark:text-blue-light-400',
      variant === 'success' && 'text-success-600 dark:text-success-400',
      variant === 'warning' && 'text-warning-600 dark:text-warning-400',
      variant === 'error' && 'text-error-600 dark:text-error-400',
    )} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {variant === 'warning' ? <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v4m0 4h.01" /></> : <><circle cx="12" cy="12" r="9" />{variant === 'success' ? <path d="m8 12 3 3 5-6" /> : variant === 'error' ? <path d="M12 7v6m0 4h.01" /> : <path d="M12 11v6m0-10h.01" />}</>}
    </svg>
    <div className="min-w-0 flex-1 break-words text-gray-600 dark:text-gray-300">
      {title && <p className="font-semibold text-gray-800 dark:text-white/90">{title}</p>}
      {children != null && <div className={cn(title && 'mt-1')}>{children}</div>}
    </div>
  </div>
}
