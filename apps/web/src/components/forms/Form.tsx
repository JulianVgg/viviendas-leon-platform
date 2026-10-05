import type { FormHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/app/lib/cn'
import Alert from '@/components/ui/Alert'

export type FormMode = 'create' | 'edit'
export type FormStatus = 'idle' | 'loading' | 'saving' | 'success' | 'error' | 'disabled' | 'readonly'

type FormProps = Omit<FormHTMLAttributes<HTMLFormElement>, 'children'> & {
  mode?: FormMode
  status?: FormStatus
  generalError?: string
  actions?: ReactNode
  children?: ReactNode
}

export default function Form({ mode = 'create', status = 'idle', generalError, actions, className, children, ...props }: FormProps) {
  const isDisabled = status === 'disabled'
  const isReadonly = status === 'readonly'
  const isBusy = status === 'loading' || status === 'saving'

  return <form
    data-form-mode={mode}
    className={cn('space-y-6', (isDisabled || isReadonly) && 'opacity-80', className)}
    aria-busy={isBusy}
    aria-disabled={isDisabled || undefined}
    aria-readonly={isReadonly || undefined}
    {...props}
  >
    {generalError && <Alert variant="error" title="No se pudo completar el formulario">{generalError}</Alert>}
    <fieldset disabled={isDisabled || isBusy || isReadonly} className="min-w-0 space-y-6 border-0 p-0">
      {children}
    </fieldset>
    {actions}
  </form>
}
