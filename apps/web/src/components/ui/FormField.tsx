import { Children, cloneElement, isValidElement, useId, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/app/lib/cn'

export default function FormField({ label, id, hint, error, required, children }: { label: string; id?: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  const generatedId = useId()
  const nativeControls = Children.toArray(children).filter((child) => isValidElement<HTMLAttributes<HTMLElement>>(child) && ['input', 'select', 'textarea'].includes(String(child.type)))
  const nativeControl = nativeControls.length === 1 && isValidElement<HTMLAttributes<HTMLElement>>(nativeControls[0]) ? nativeControls[0] : undefined
  const fieldId = id ?? nativeControl?.props.id ?? generatedId
  const messageId = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
  const controls = Children.map(children, (child) => {
    // Only enhance direct native controls; custom components keep their own contract.
    if (!nativeControl || !isValidElement<HTMLAttributes<HTMLElement>>(child) || !['input', 'select', 'textarea'].includes(String(child.type))) return child
    const controlId = child.props.id ?? fieldId
    if (controlId !== fieldId) return child
    const describedBy = [...new Set([child.props['aria-describedby'], messageId].filter(Boolean).join(' ').split(/\s+/).filter(Boolean))].join(' ')
    return cloneElement(child, {
      id: controlId,
      'aria-invalid': child.props['aria-invalid'] ?? (error ? true : undefined),
      'aria-required': child.props['aria-required'] ?? (required || undefined),
      'aria-describedby': describedBy || undefined,
    })
  })

  return <div className="min-w-0 space-y-1.5">
    <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}{required && <span aria-hidden="true" className="ms-1 text-red-600 dark:text-red-400">*</span>}</label>
    {controls}
    {error ? <p id={messageId} role="alert" className="text-xs leading-5 text-red-700 dark:text-red-300">{error}</p> : hint && <p id={messageId} className="text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</p>}
  </div>
}

// oxlint-disable-next-line react/only-export-components
export const formControlClassName = cn('h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-theme-xs outline-none transition-colors motion-reduce:transition-none placeholder:text-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 aria-invalid:border-red-500 aria-invalid:focus:border-red-500 aria-invalid:focus:ring-red-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 [&[readonly]]:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:scheme-dark dark:text-slate-100 dark:placeholder:text-slate-400 dark:aria-invalid:border-red-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-400 dark:[&[readonly]]:bg-slate-800/50')
