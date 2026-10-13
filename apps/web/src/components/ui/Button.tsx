import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/app/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg' }>(function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}, ref) {
  return <button
    ref={ref}
    className={cn(
      'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900',
      size === 'sm' && 'min-h-9 px-3 py-2',
      size === 'lg' && 'min-h-12 px-5 py-3',
      variant === 'primary' && 'bg-brand-500 text-white shadow-theme-xs enabled:hover:bg-brand-600 enabled:active:bg-brand-700',
      variant === 'secondary' && 'border border-slate-300 bg-white text-slate-700 shadow-theme-xs enabled:hover:bg-slate-50 enabled:active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:enabled:hover:bg-slate-800 dark:enabled:active:bg-slate-700',
      variant === 'danger' && 'bg-red-600 text-white shadow-theme-xs enabled:hover:bg-red-700 enabled:active:bg-red-800',
      variant === 'ghost' && 'text-slate-600 enabled:hover:bg-slate-100 enabled:active:bg-slate-200 dark:text-slate-300 dark:enabled:hover:bg-white/5 dark:enabled:active:bg-white/10',
      className,
    )}
    {...props}
  />
})

export default Button
