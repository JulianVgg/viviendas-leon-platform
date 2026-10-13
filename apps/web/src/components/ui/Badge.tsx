import type { HTMLAttributes } from 'react'
import { cn } from '@/app/lib/cn'

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error'

export default function Badge({ className, variant = 'neutral', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn(
    'inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5',
    variant === 'neutral' && 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-white/5 dark:text-slate-300',
    variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300',
    variant === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300',
    variant === 'error' && 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300',
    className,
  )} {...props} />
}
