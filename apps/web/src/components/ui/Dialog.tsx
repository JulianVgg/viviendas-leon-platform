import { useEffect, useRef, type ReactNode } from 'react'
import Button from './Button'

export default function Dialog({ open, title, description, onClose, children, actions }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
    <button type="button" aria-label="Cerrar diálogo" className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
    <section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800"><div><h2 id="dialog-title" className="font-semibold text-slate-900 dark:text-white">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}</div><Button ref={closeButtonRef} type="button" variant="ghost" size="sm" aria-label="Cerrar diálogo" onClick={onClose}>Cerrar</Button></div>
      <div className="p-5">{children}</div>
      {actions && <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-5 sm:flex-row sm:justify-end dark:border-slate-800">{actions}</div>}
    </section>
  </div>
}
