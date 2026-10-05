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

  return <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">
    <Button type="button" variant="secondary" onClick={onCancel} disabled={isDisabled}>Cancelar</Button>
    <Button type="submit" disabled={isDisabled}>{submitLabel}</Button>
  </div>
}
