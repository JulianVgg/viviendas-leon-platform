import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, RefreshCcw } from 'lucide-react'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { fetchFamilyProgramOptions, fetchIntegralFamily } from '../services/familyService'
import type { FamilyProgramOption, FamilyParticipationRecord, IntegralFamilyRecord } from '../types/familyIntegral'
import FamilyProgramDialog from './FamilyProgramDialog'

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha'
  const date = value.slice(0, 10)
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

type Props = { family: IntegralFamilyRecord; onUpdated: (family: IntegralFamilyRecord) => void }

export default function FamilyProgramsSection({ family, onUpdated }: Props) {
  const isOnline = useOnlineStatus()
  const [entries, setEntries] = useState<FamilyParticipationRecord[]>(family.programas)
  const [options, setOptions] = useState<FamilyProgramOption[]>([])
  const [catalogError, setCatalogError] = useState('')
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [dialog, setDialog] = useState<{ participation?: FamilyParticipationRecord } | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { setEntries(family.programas) }, [family.programas])
  useEffect(() => {
    const controller = new AbortController()
    void fetchFamilyProgramOptions(controller.signal).then(setOptions).catch((cause: unknown) => {
      if (!controller.signal.aborted) setCatalogError(cause instanceof Error ? cause.message : 'No se pudieron consultar los programas activos.')
    }).finally(() => { if (!controller.signal.aborted) setLoadingOptions(false) })
    return () => controller.abort()
  }, [])

  const available = useMemo(() => {
    const linked = new Set(entries.map(({ programaId }) => programaId))
    return options.filter((option) => !linked.has(option.id))
  }, [entries, options])

  async function saved(record: FamilyParticipationRecord) {
    setDialog(null)
    setError('')
    setEntries((previous) => [...previous.filter(({ id }) => id !== record.id), record]
      .sort((a, b) => a.programa.nombre.localeCompare(b.programa.nombre, 'es')))
    setNotice('Participación guardada correctamente.')
    try {
      const updated = await fetchIntegralFamily(String(family.id))
      onUpdated(updated)
    } catch {
      setNotice('El guardado fue confirmado, pero no se pudo actualizar todo el expediente. Recarga antes de continuar con otras modificaciones.')
    }
  }

  const rows = entries.map((item) => [
    <span key="name" className="font-medium">{item.programa.nombre}</span>,
    formatDate(item.fechaIngreso),
    formatDate(item.fechaSalida),
    <Badge key="state" variant={item.estado === 'ACTIVO' ? 'success' : 'neutral'}>{item.estado || 'Sin estado'}</Badge>,
    <span key="notes" className="block max-w-xs whitespace-pre-wrap break-words">{item.observaciones || 'Sin observaciones'}</span>,
    <Button type="button" key="edit" variant="secondary" size="sm" disabled={!isOnline} onClick={() => { setError(''); setNotice(''); setDialog({ participation: item }) }}><Pencil size={14} />Editar</Button>,
  ])

  return <>
    <Card>
      <CardHeader title="Programas asociados" description="Agrega o actualiza la participación de esta familia en los programas institucionales. Las modificaciones se guardan independientemente de la información general."
        actions={<Button type="button" disabled={!isOnline || loadingOptions || Boolean(catalogError) || !available.length} onClick={() => { setError(''); setNotice(''); setDialog({}) }}><Plus size={16} />Asociar programa</Button>} />
      <CardBody>
        {!isOnline && <Alert variant="warning" title="Sin conexión">Necesitas conexión para administrar participaciones.</Alert>}
        {catalogError && <Alert variant="warning" title="Catálogo no disponible">{catalogError} Puedes seguir consultando y editando las participaciones existentes.</Alert>}
        {error && <Alert variant="error" title="No se pudieron consultar los datos">{error}</Alert>}
        {notice && <div className="mb-4"><Alert variant="success" title="Resultado de la operación">{notice}</Alert></div>}
        {entries.length ? <DataTable caption="Programas asociados a la familia" columns={['Programa', 'Ingreso', 'Salida', 'Participación', 'Observaciones', 'Acciones']} rows={rows} />
          : <p className="py-8 text-center text-sm text-gray-500">No hay programas asociados a esta familia.</p>}
        {!loadingOptions && !catalogError && !available.length && <p className="mt-4 text-sm text-gray-500">No hay otros programas activos disponibles para esta familia.</p>}
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" size="sm" disabled={!isOnline} onClick={() => {
            void fetchIntegralFamily(String(family.id)).then((record) => { onUpdated(record); setError(''); setNotice('Expediente actualizado desde el servidor.') })
              .catch(() => setError('No se pudo actualizar el expediente.'))
          }}><RefreshCcw size={15} />Actualizar participaciones</Button>
        </div>
      </CardBody>
    </Card>
    {dialog && <FamilyProgramDialog key={`${dialog.participation?.id ?? 'new'}`} open familyId={family.id}
      participation={dialog.participation} availablePrograms={available}
      onClose={() => setDialog(null)} onSaved={(record) => { void saved(record) }} />}
  </>
}
