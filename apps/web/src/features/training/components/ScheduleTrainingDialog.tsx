import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { createTraining, getTrainingCommunities, type Training, type TrainingCommunity } from '../services/trainingService'

const textAreaClass = `${formControlClassName} h-auto min-h-24 resize-y`
const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })

export default function ScheduleTrainingDialog({ date, onClose, onSaved }: {
  date: string | null
  onClose: () => void
  onSaved: (created: Training) => void
}) {
  const [tema, setTema] = useState('')
  const [fecha, setFecha] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [facilitador, setFacilitador] = useState('')
  const [comunidadId, setComunidadId] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [comunidades, setComunidades] = useState<TrainingCommunity[]>([])
  const [communityWarning, setCommunityWarning] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!date) return
    let active = true
    setTema(''); setFecha(date); setDescripcion('')
    setHoraInicio(''); setHoraFin(''); setFacilitador('')
    setComunidadId(''); setObservaciones('')
    setError(''); setCommunityWarning(''); setComunidades([])
    void getTrainingCommunities().then(items => {
      if (active) setComunidades(items)
    }).catch(() => {
      if (active) setCommunityWarning('No fue posible cargar las comunidades. Puedes guardar sin seleccionar una.')
    })
    return () => { active = false }
  }, [date])

  const save = async () => {
    if (saving || !date) return
    if (!tema.trim() || !fecha || fecha < new Intl.DateTimeFormat('sv-SE',{ timeZone:'America/Guatemala' }).format(new Date())) { setError('Selecciona una fecha vigente.'); return }
    if (horaInicio && horaFin && horaFin <= horaInicio) {
      setError('La hora de finalización debe ser posterior a la hora de inicio.'); return
    }
    setSaving(true)
    setError('')
    try {
      const created = await createTraining({
        tema: tema.trim(), descripcion: descripcion.trim(), fecha,
        horaInicio: horaInicio || null, horaFin: horaFin || null,
        facilitadorNombre: facilitador.trim(), observaciones: observaciones.trim(),
        comunidadId: comunidadId ? Number(comunidadId) : null, estado: 'PROGRAMADA',
      })
      onSaved(created)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar la capacitación.')
    } finally {
      setSaving(false)
    }
  }

  return <Dialog open={Boolean(date)} onClose={() => { if (!saving) onClose() }}
    title="Agendar capacitación" description={date ? `Fecha seleccionada: ${formatDate(date)}` : ''}
    className="max-w-2xl"
    actions={<>
      <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
      <Button type="button" onClick={() => void save()} disabled={saving || !tema.trim() || !fecha}>
        {saving ? 'Guardando…' : 'Agendar capacitación'}
      </Button>
    </>}>
    <div className="space-y-4">
      <FormField label="Tema de la capacitación" required>
        <input value={tema} onChange={e => setTema(e.target.value)} maxLength={160} placeholder="Ej. Buenas prácticas agrícolas" className={formControlClassName} disabled={saving} />
      </FormField>
      <FormField label="Descripción">
        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={2000} rows={3} placeholder="¿Qué se impartirá?" className={textAreaClass} disabled={saving} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Fecha" required>
          <input type="date" value={fecha} min={new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Guatemala'}).format(new Date())} onChange={e => setFecha(e.target.value)} className={formControlClassName} disabled={saving} />
        </FormField>
        <FormField label="Hora de inicio">
          <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className={formControlClassName} disabled={saving} />
        </FormField>
        <FormField label="Hora de finalización">
          <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className={formControlClassName} disabled={saving} />
        </FormField>
      </div>
      <FormField label="Comunidad" hint="Opcional: selecciona la comunidad donde se impartirá.">
        <select value={comunidadId} onChange={e => setComunidadId(e.target.value)} className={formControlClassName} disabled={saving}>
          <option value="">Sin comunidad asignada</option>
          {comunidades.map(item => <option key={item.id} value={item.id}>{item.nombre} — {item.municipio.nombre}</option>)}
        </select>
      </FormField>
      {communityWarning && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">{communityWarning}</p>}
      <FormField label="Facilitador">
        <input value={facilitador} onChange={e => setFacilitador(e.target.value)} maxLength={160} placeholder="Nombre de quien imparte" className={formControlClassName} disabled={saving} />
      </FormField>
      <FormField label="Observaciones">
        <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} maxLength={2000} rows={2} className={textAreaClass} disabled={saving} />
      </FormField>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
    </div>
  </Dialog>
}
