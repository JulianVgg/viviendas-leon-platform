import { useState } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  return <div className="relative"><Button type="button" variant="secondary" size="sm" aria-label="Abrir notificaciones" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Avisos</Button>{open && <Card className="absolute end-0 mt-2 w-72 p-4 shadow-xl"><h2 className="font-medium text-slate-900 dark:text-white">Notificaciones</h2><p className="py-6 text-center text-sm text-slate-500">No hay notificaciones.</p></Card>}</div>
}
