import { useState } from 'react'

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  return <div className="relative"><button type="button" aria-label="Abrir notificaciones" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-300 dark:focus-visible:ring-offset-slate-950 sm:px-3 sm:text-sm">Avisos</button>{open && <div className="absolute end-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"><h2 className="font-medium text-slate-900 dark:text-white">Notificaciones</h2><p className="py-6 text-center text-sm text-slate-500">No hay notificaciones.</p></div>}</div>
}
