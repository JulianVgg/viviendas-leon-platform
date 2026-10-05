import { cloneElement, isValidElement, useId, type ReactElement } from 'react'
import { cn } from '@/app/lib/cn'

type FormFieldProps = {
  label: string
  id?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  children: ReactElement
}

type ControlProps = {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  'aria-required'?: boolean
  disabled?: boolean
}

export default function FormField({ label, id, hint, error, required, disabled, children }: FormFieldProps) {
  const generatedId = useId()
  const controlId = id ?? `field-${generatedId}`
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children) ? cloneElement(children as ReactElement<ControlProps>, {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': required ? true : undefined,
    disabled,
  }) : children

  return <div className="space-y-1.5">
    <label htmlFor={controlId} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}{required && <span aria-hidden="true" className="ms-1 text-red-600">*</span>}
    </label>
    {control}
    {error ? <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p> : hint && <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
  </div>
}

// oxlint-disable-next-line react/only-export-components
export const formControlClassName = cn('h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800')
