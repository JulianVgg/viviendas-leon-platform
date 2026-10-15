import { Children, cloneElement, isValidElement, useId, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/app/lib/cn'

// Conserva la asociación accesible label/control, el manejo de errores y la API actual.
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
    <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}{required && <span aria-hidden="true" className="ms-1 text-error-600 dark:text-error-400">*</span>}</label>
    {controls}
    {error ? <p id={messageId} role="alert" className="text-xs leading-5 text-error-600 dark:text-error-400">{error}</p> : hint && <p id={messageId} className="text-xs leading-5 text-gray-500 dark:text-gray-400">{hint}</p>}
  </div>
}

// No usar appearance-none aquí: se conservará la flecha nativa en los selects.
// oxlint-disable-next-line react/only-export-components
export const formControlClassName = cn(
  'h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs outline-none transition-[border-color,box-shadow,background-color] duration-200 motion-reduce:transition-none placeholder:text-gray-400',
  'focus:border-brand-300 focus:ring-3 focus:ring-brand-500/20',
  'aria-invalid:border-error-500 aria-invalid:focus:border-error-300 aria-invalid:focus:ring-error-500/20',
  'disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500 [&[readonly]]:bg-gray-50',
  'dark:border-gray-700 dark:bg-gray-900 dark:scheme-dark dark:text-white/90 dark:placeholder:text-gray-500 dark:focus:border-brand-500',
  'dark:aria-invalid:border-error-500 dark:aria-invalid:focus:border-error-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400 dark:[&[readonly]]:bg-gray-800/50',
)
