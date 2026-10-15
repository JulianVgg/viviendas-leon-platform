import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/app/lib/cn'

// Mantener esta interfaz: los formularios y el header actuales usan estas variantes.
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }>(function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}, ref) {
  return <button
    ref={ref}
    className={cn(
      'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent text-sm font-medium shadow-theme-xs transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-gray-900',
      size === 'sm' && 'min-h-9 px-4 py-2',
      size === 'md' && 'px-5 py-2.5',
      size === 'lg' && 'min-h-12 px-6 py-3',
      variant === 'primary' && 'bg-brand-500 text-white enabled:hover:bg-brand-600 enabled:active:bg-brand-700',
      variant === 'secondary' && 'border-gray-300 bg-white text-gray-700 enabled:hover:bg-gray-50 enabled:active:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:enabled:hover:bg-gray-700 dark:enabled:active:bg-gray-600',
      variant === 'danger' && 'bg-error-600 text-white enabled:hover:bg-error-700 enabled:active:bg-error-800',
      variant === 'ghost' && 'bg-transparent text-gray-600 shadow-none enabled:hover:bg-gray-100 enabled:active:bg-gray-200 dark:text-gray-300 dark:enabled:hover:bg-white/5 dark:enabled:active:bg-white/10',
      className,
    )}
    {...props}
  />
})

export default Button
