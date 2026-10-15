import type { HTMLAttributes } from 'react'
import { cn } from '@/app/lib/cn'

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error'

// Versión light/pill de TailAdmin Pro, con las variantes semánticas existentes.
export default function Badge({ className, variant = 'neutral', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn(
    'inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-theme-xs font-medium leading-5',
    variant === 'neutral' && 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80',
    variant === 'success' && 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
    variant === 'warning' && 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
    variant === 'error' && 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400',
    className,
  )} {...props} />
}
