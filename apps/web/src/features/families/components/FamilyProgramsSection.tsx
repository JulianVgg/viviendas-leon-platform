import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import { fetchFamilyProgramOptions } from '../services/familyService'
import type { FamilyProgramOption, FamilyParticipationRecord } from '../types/familyIntegral'
import FamilyProgramDialog from './FamilyProgramDialog'

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha'
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

type Props = {
  familyId: number
  entries: FamilyParticipationRecord[]
  onChange: (entries: FamilyParticipationRecord[]) => void
  disabled?: boolean
}

export default function FamilyProgramsSection({ familyId, entries, onChange, disabled }: Props) {
  const [options, setOptions] = useState<FamilyProgramOption[]>([])
  const [catalogError, setCatalogError] = useState('')
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [dialog, setDialog] = useState<{ participation?: FamilyParticipationRecord } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void fetchFamilyProgramOptions(controller.signal).then(setOptions).catch(() => {
      if (!controller.signal.aborted) setCatalogError('No se pudieron cargar los programas activos.')
    }).finally(() => { if (!controller.signal.aborted) setLoadingOptions(false) })
    return () => controller.abort()
  }, [])

  const available = useMemo(() => {
    const linked = new Set(entries.map(({ programaId }) => programaId))
    return options.filter((option) => !linked.has(option.id))
  }, [entries, options])

  function stage(record: FamilyParticipationRecord) {
    onChange([...entries.filter(({ id }) => id !== record.id), record]
      .sort((a, b) => a.programa.nombre.localeCompare(b.programa.nombre, 'es')))
    setDialog(null)
  }

  const rows = entries.map((item) => [
    <span key="name" className="font-medium">{item.programa.nombre}</span>,
    formatDate(item.fechaIngreso),
    formatDate(item.fechaSalida),
    <Badge key="state" variant={item.estado === 'ACTIVO' ? 'success' : 'neutral'}>{item.estado || 'Sin estado'}</Badge>,
    <span key="notes" className="block max-w-xs whitespace-pre-wrap break-words">{item.observaciones || 'Sin observaciones'}</span>,
    <Button type="button" key="edit" variant="secondary" size="sm" disabled={disabled} onClick={() => setDialog({ participation: item })}><Pencil size={14} />Editar</Button>,
  ])

  return <div className="visits-enter">
    <Card>
      <CardHeader title="Programas asociados" actions={<Button type="button" disabled={disabled || loadingOptions || Boolean(catalogError) || !available.length} onClick={() => setDialog({})}><Plus size={16} />Asociar programa</Button>} />
      <CardBody>
        {catalogError && <Alert variant="warning" title="Catálogo no disponible">{catalogError}</Alert>}
        {entries.length ? <DataTable caption="Programas asociados a la familia" columns={['Programa', 'Ingreso', 'Salida', 'Participación', 'Observaciones', 'Acciones']} rows={rows} />
          : <p className="py-8 text-center text-sm text-gray-500">No hay programas asociados a esta familia.</p>}
      </CardBody>
    </Card>
    {dialog && <FamilyProgramDialog key={dialog.participation?.id ?? 'new'} open familyId={familyId} deferred
      participation={dialog.participation} availablePrograms={available} onClose={() => setDialog(null)} onSaved={stage} />}
  </div>
}
