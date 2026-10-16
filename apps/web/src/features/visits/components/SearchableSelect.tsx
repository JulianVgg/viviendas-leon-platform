import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { formControlClassName } from '@/components/ui/FormField'

export type SearchOption = { value: string; label: string }
type Props = {
  id: string; label: string; value: string; options: SearchOption[]; onChange: (value: string) => void
  placeholder?: string; disabled?: boolean; required?: boolean
}
const simplify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-GT')

// Combobox accessible por teclado y tacto: busca en catálogos sin listas largas.
export default function SearchableSelect({ id, label, value, options, onChange, placeholder = 'Buscar o seleccionar...', disabled, required }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const container = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const selected = options.find(item => item.value === value)
  const matches = useMemo(() => options.filter(item => simplify(item.label).includes(simplify(query))).slice(0, 80), [options, query])
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  useEffect(() => { setActive(0) }, [query])
  const choose = (next: string) => {
    onChange(next); setQuery(''); setOpen(false)
    input.current?.blur()
  }
  return <div ref={container} className="relative min-w-0 space-y-1.5">
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}{required && <span className="ms-1 text-error-600">*</span>}</label>
    <div className="relative">
      <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input ref={input} id={id} type="text" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        aria-autocomplete="list" aria-activedescendant={open && matches.length ? `${listId}-${active}` : undefined}
        aria-required={required || undefined} autoComplete="off" disabled={disabled}
        className={`${formControlClassName} w-full pl-10 pr-16`}
        placeholder={selected && !open ? selected.label : placeholder}
        value={open ? query : (selected?.label ?? '')}
        onFocus={() => { setQuery(''); setOpen(true) }}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); setQuery(''); return }
          if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setOpen(true); else setActive(n => Math.min(matches.length - 1, n + 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive(n => Math.max(0, n - 1)) }
          if (e.key === 'Enter' && open && matches[active]) { e.preventDefault(); choose(matches[active].value) }
        }}/>
      <button type="button" disabled={disabled} aria-label={value ? `Borrar selección: ${label}` : `Mostrar opciones de ${label}`}
        onClick={() => value ? choose('') : (setOpen(v=>!v), input.current?.focus())}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-brand-500">
        {value ? <X size={17}/> : <ChevronDown size={17}/>}
      </button>
    </div>
    {open && !disabled && <ul id={listId} role="listbox" aria-label={label} className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
      {matches.length ? matches.map((item, i) => <li key={item.value} id={`${listId}-${i}`} role="option" aria-selected={value===item.value}>
        <button type="button" tabIndex={-1} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(item.value)}
          className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${active===i ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10'}`}>
          <span className="break-words">{item.label}</span>{value===item.value && <Check size={15} className="shrink-0"/>}
        </button>
      </li>) : <li className="p-3 text-sm text-gray-500">Sin coincidencias</li>}
    </ul>}
  </div>
}
export const catalogOptions = (values: string[]): SearchOption[] => values.map(item=>({ value:item,label:item }))
