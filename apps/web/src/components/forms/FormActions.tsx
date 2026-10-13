import Button from '@/components/ui/Button'

type FormActionsProps = {
  mode?: 'create' | 'edit'
  submitting?: boolean
  disabled?: boolean
  blocked?: boolean
  onCancel?: () => void
}

export default function FormActions({ mode = 'create', submitting = false, disabled = false, blocked = false, onCancel }: FormActionsProps) {
  const isDisabled = submitting || disabled || blocked
  const submitLabel = submitting ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar'

  return <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:flex-wrap sm:justify-end dark:border-slate-800">
    <Button type="button" variant="secondary" onClick={onCancel} disabled={isDisabled}>Cancelar</Button>
    <Button type="submit" disabled={isDisabled} aria-busy={submitting}>{submitting && <svg aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>}{submitLabel}</Button>
  </div>
}
