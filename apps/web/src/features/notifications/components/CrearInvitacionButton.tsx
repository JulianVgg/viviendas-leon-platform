import { useState } from 'react'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import InstitutionalEventDialog from '@/features/calendar/components/InstitutionalEventDialog'
import { loadParticipants, saveEvent, type CalendarPerson } from '@/features/calendar/services/calendarService'
import { emitirCambioNotificaciones } from '../services/notificationsService'

export function puedeGestionarInvitaciones(roles: string[]): boolean {
  return roles.some(rol => {
    const clave = rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    return clave === 'direccion general' || clave === 'coordinadora del programa agroforestal'
  })
}

export default function CrearInvitacionButton() {
  const { usuario } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [usuarios, setUsuarios] = useState<CalendarPerson[]>([])
  const [error, setError] = useState('')
  if (!usuario || !puedeGestionarInvitaciones(usuario.roles)) return null

  async function abrir() {
    setError('')
    setCargando(true)
    try {
      setUsuarios(await loadParticipants())
      setAbierto(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los usuarios.')
    } finally { setCargando(false) }
  }

  return <>
    <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">Solo Dirección y Coordinación</p>
      <Button type="button" onClick={() => void abrir()} disabled={cargando}>
        <Plus size={17} /> {cargando ? 'Cargando...' : 'Crear invitación'}
      </Button>
    </div>
    {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <InstitutionalEventDialog
      open={abierto} selected={null} date={new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Guatemala' })}
      users={usuarios} editable onClose={() => setAbierto(false)}
      onSave={async (data) => {
        if (data.participantesIds.length === 0) throw new Error('Selecciona al menos un participante para enviar la invitación.')
        await saveEvent(data)
        emitirCambioNotificaciones()
      }}
      onDelete={async () => { throw new Error('No hay un evento seleccionado para eliminar.') }}
    />
  </>
}
