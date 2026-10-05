import type { HTMLAttributes } from 'react'
import { cn } from '@/app/lib/cn'

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error'

export default function Badge({ className, variant = 'neutral', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn(
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
    variant === 'neutral' && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    variant === 'success' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    variant === 'warning' && 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    variant === 'error' && 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    className,
  )} {...props} />
}
