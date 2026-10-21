import { useMemo, useState } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/common/EmptyState'
import { formatRecordDate } from '../services/familyRecord'
import { filterParticipations, orderParticipations, participationCategory, participationStateLabel, participationSummary, type ParticipationFilter } from '../services/familyProgramHistory'
import type { FamilyParticipationRecord } from '../types/familyIntegral'

const filters: Array<{ id: ParticipationFilter; label: string }> = [
  { id: 'TODOS', label: 'Todas' },
  { id: 'ACTIVOS', label: 'Activas' },
  { id: 'ANTERIORES', label: 'Anteriores' },
  { id: 'OTROS', label: 'Sin clasificar' },
]

const textClass = 'min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]'

export default function FamilyProgramHistory({ participations }: { participations: FamilyParticipationRecord[] }) {
  const [filter, setFilter] = useState<ParticipationFilter>('TODOS')
  const ordered = useMemo(() => orderParticipations(participations), [participations])
  const summary = useMemo(() => participationSummary(participations), [participations])
  const visible = useMemo(() => filterParticipations(ordered, filter), [ordered, filter])

  return <Card aria-label="Historial de participación familiar">
    <CardHeader title="Historial de participación" description="Participaciones actuales y anteriores de esta familia. Los programas inactivos conservan su historial." />
    <CardBody>
      {!participations.length ? <EmptyState title="Sin programas asociados" description="Esta familia no tiene participaciones en programas en el expediente consultado." /> : <div className="min-w-0 space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Resumen del historial">
          {([
            ['Total', summary.total], ['Activas', summary.activos], ['Anteriores', summary.anteriores], ['Sin clasificar', summary.otros],
          ] as const).map(([label, count]) => <div key={label} className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="break-words text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{count}</p>
          </div>)}
        </div>
        <div role="group" aria-label="Filtrar participaciones" className="flex flex-wrap gap-2">
          {filters.map(({ id, label }) => <Button key={id} type="button" size="sm" variant={filter === id ? 'primary' : 'secondary'} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</Button>)}
        </div>
        <p role="status" className="text-xs text-gray-500 dark:text-gray-400">Mostrando {visible.length} de {participations.length} participaciones.</p>
        {visible.length ? <ol className="min-w-0 space-y-3" aria-label="Participaciones de la familia">
          {visible.map((association) => {
            const category = participationCategory(association.estado)
            return <li key={association.id} className="min-w-0 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:p-5">
              <div className="flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <h3 className={`font-medium text-slate-900 dark:text-slate-100 ${textClass}`}>{association.programa.nombre}</h3>
                  <p className={`mt-1 text-xs text-slate-500 dark:text-slate-400 ${textClass}`}>Programa #{association.programaId} · Asociación #{association.id}</p>
                </div>
                <Badge variant={category === 'ACTIVOS' ? 'success' : association.estado?.trim().toUpperCase() === 'RETIRADO' ? 'warning' : 'neutral'} className="max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">{participationStateLabel(association.estado)}</Badge>
              </div>
              <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 dark:border-gray-800">
                <div className="min-w-0"><dt className="text-xs text-slate-500 dark:text-slate-400">Fecha de ingreso</dt><dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">{formatRecordDate(association.fechaIngreso)}</dd></div>
                <div className="min-w-0"><dt className="text-xs text-slate-500 dark:text-slate-400">Fecha de salida</dt><dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">{formatRecordDate(association.fechaSalida)}</dd></div>
                <div className="min-w-0 sm:col-span-2"><dt className="text-xs text-slate-500 dark:text-slate-400">Observaciones</dt><dd className={`mt-1 text-sm text-slate-700 dark:text-slate-300 ${textClass}`}>{association.observaciones || 'Sin observaciones'}</dd></div>
              </dl>
            </li>
          })}
        </ol> : <p className="rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 dark:border-gray-800" role="status">No hay participaciones en esta categoría. Selecciona «Todas» para consultar el historial completo.</p>}
      </div>}
    </CardBody>
  </Card>
}
