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
      'inline-flex min-h-10 items-center justify-center rounded-lg px-4 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-slate-950',
      size === 'sm' && 'min-h-9 px-3 text-sm',
      size === 'lg' && 'min-h-11 px-5',
      variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
      variant === 'secondary' && 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
      variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
      variant === 'ghost' && 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
      className,
    )}
    {...props}
  />
})

export default Button
