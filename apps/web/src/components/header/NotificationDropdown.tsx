import { useEffect, useRef, useState } from 'react'
import Card from '@/components/ui/Card'

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !dropdownRef.current?.contains(event.target)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return <div ref={dropdownRef} className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <button ref={buttonRef} type="button" className="layout-icon-button layout-focus" aria-label="Abrir notificaciones" aria-expanded={open} aria-controls="notification-panel" onClick={() => setOpen((value) => !value)}>
      <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4M12 2V1" /></svg>
    </button>
    {open && <Card id="notification-panel" className="absolute -end-12 z-10 mt-3 w-72 max-w-[calc(100vw-1.5rem)] p-4 shadow-theme-lg sm:end-0"><div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800"><h2 className="font-semibold text-slate-900 dark:text-white">Notificaciones</h2><button type="button" aria-label="Cerrar notificaciones" className="layout-focus flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" onClick={() => { setOpen(false); buttonRef.current?.focus() }}><span aria-hidden="true">×</span></button></div><p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No hay notificaciones.</p></Card>}
  </div>
}
