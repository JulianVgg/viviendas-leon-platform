import { useId, useState, type ReactNode } from 'react'
import Button from '@/components/ui/Button'
import FormSection from './FormSection'

type LocalItem<T> = {
  id: string
  value: T
}

let nextLocalId = 0

type FormRepeaterProps<T> = {
  title: string
  description?: string
  initialItems?: T[]
  createItem: () => T
  disabled?: boolean
  readOnly?: boolean
  itemError?: (value: T, index: number) => string | undefined
  renderItem: (value: T, index: number, id: string, onChange: (value: T) => void, error?: string) => ReactNode
  onChange?: (items: T[]) => void
}

export default function FormRepeater<T>({ title, description, initialItems = [], createItem, disabled = false, readOnly = false, itemError, renderItem, onChange }: FormRepeaterProps<T>) {
  const instanceId = useId()
  const createLocalId = () => `repeater-${instanceId}-${++nextLocalId}`
  const [items, setItems] = useState<LocalItem<T>[]>(() => initialItems.map((value) => ({ id: createLocalId(), value })))
  const blocked = disabled || readOnly

  const updateItems = (nextItems: LocalItem<T>[]) => {
    setItems(nextItems)
    onChange?.(nextItems.map((item) => item.value))
  }

  const updateItem = (id: string, value: T) => {
    if (!blocked) updateItems(items.map((item) => item.id === id ? { ...item, value } : item))
  }
  const addItem = () => {
    if (!blocked) updateItems([...items, { id: createLocalId(), value: createItem() }])
  }
  const removeItem = (id: string) => {
    if (!blocked) updateItems(items.filter((item) => item.id !== id))
  }

  return <FormSection title={title} description={description} variant="outlined">
    <div className="space-y-4">
      {items.map((item, index) => <div key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">{renderItem(item.value, index, item.id, (value) => updateItem(item.id, value), itemError?.(item.value, index))}</div>
          <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)} disabled={blocked} aria-label={`Eliminar elemento ${index + 1}`}>Eliminar</Button>
        </div>
      </div>)}
      <Button type="button" variant="secondary" size="sm" onClick={addItem} disabled={blocked}>Agregar elemento</Button>
    </div>
  </FormSection>
}
