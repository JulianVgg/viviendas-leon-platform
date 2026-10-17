import { useId, useRef, useState, type KeyboardEvent } from 'react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import DataTableContainer from '@/components/common/DataTableContainer'
import EmptyState from '@/components/common/EmptyState'
import { familyStateVariant, formatRecordDate } from '../services/familyRecord'
import type { IntegralFamilyRecord } from '../types/familyIntegral'

const tabs = [
  { id: 'general', label: 'Información general' },
  { id: 'members', label: 'Integrantes' },
  { id: 'programs', label: 'Programas' },
] as const
type RecordTab = typeof tabs[number]['id']
const textClass = 'block min-w-0 max-w-80 whitespace-pre-wrap break-words [overflow-wrap:anywhere]'

export default function FamilyIntegralRecord({ family }: { family: IntegralFamilyRecord }) {
  const instanceId = useId()
  const [selected, setSelected] = useState<RecordTab>('general')
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const tabId = (tab: RecordTab) => `family-record-${instanceId}-${tab}-tab`
  const panelId = (tab: RecordTab) => `family-record-${instanceId}-${tab}-panel`

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    setSelected(tabs[next].id)
    buttons.current[next]?.focus()
  }

  const generalFields = [
    ['ID del expediente', String(family.id)],
    ['Nombre de referencia', family.nombreReferencia],
    ['Comunidad', family.comunidad.nombre],
    ['Municipio', family.comunidad.municipio.nombre],
    ['Fecha de ingreso', formatRecordDate(family.fechaIngreso)],
  ]
  const memberRows = family.integrantes.map((member) => [
    <span key={`name-${member.id}`} className={`${textClass} min-w-40 font-medium text-slate-900 dark:text-slate-100`}>{member.nombreCompleto}</span>,
    formatRecordDate(member.fechaNacimiento),
    <span key={`sex-${member.id}`} className={textClass}>{member.sexo || 'No indicado'}</span>,
    <span key={`relationship-${member.id}`} className={textClass}>{member.parentesco || 'No indicado'}</span>,
    <span key={`phone-${member.id}`} className={textClass}>{member.telefono || 'Sin teléfono'}</span>,
    <Badge key={`active-${member.id}`} variant={member.activo ? 'success' : 'neutral'}>{member.activo ? 'Activo' : 'Inactivo'}</Badge>,
  ])
  const programRows = family.programas.map((association) => [
    <div key={`program-${association.id}`} className={`${textClass} min-w-44`}><span className="font-medium text-slate-900 dark:text-slate-100">{association.programa.nombre}</span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">Programa #{association.programaId}<br />Asociación #{association.id}</span></div>,
    formatRecordDate(association.fechaIngreso),
    formatRecordDate(association.fechaSalida),
    <Badge key={`state-${association.id}`} className="max-w-64 whitespace-normal break-words [overflow-wrap:anywhere]">{association.estado || 'Sin estado definido'}</Badge>,
    <span key={`notes-${association.id}`} className={`${textClass} min-w-48`}>{association.observaciones || 'Sin observaciones'}</span>,
  ])

  return <div className="min-w-0 space-y-6">
    <Card aria-label="Identificación del expediente">
      <CardBody><div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Expediente #{family.id} · Solo lectura</p><h2 className="mt-2 break-words text-xl font-semibold text-slate-900 [overflow-wrap:anywhere] sm:text-2xl dark:text-white">{family.nombreReferencia}</h2><p className="mt-2 break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{family.comunidad.nombre} · {family.comunidad.municipio.nombre}</p></div>
        <div className="min-w-0 sm:max-w-64"><p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Estado de la familia</p><Badge variant={familyStateVariant(family.estado)} className="max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">{family.estado}</Badge></div>
      </div></CardBody>
    </Card>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Card aria-label="Resumen de integrantes"><CardBody><p className="text-sm font-medium text-slate-600 dark:text-slate-300">Integrantes registrados</p><p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">{family.integrantes.length}</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Todos los integrantes asociados, activos e inactivos.</p></CardBody></Card>
      <Card aria-label="Resumen de programas"><CardBody><p className="text-sm font-medium text-slate-600 dark:text-slate-300">Programas asociados</p><p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">{family.programas.length}</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Participaciones registradas en el expediente.</p></CardBody></Card>
    </div>
    <div className="min-w-0 space-y-5">
      <div role="tablist" aria-label="Secciones del expediente familiar" aria-orientation="horizontal" className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {tabs.map((tab, index) => <button key={tab.id} ref={(element) => { buttons.current[index] = element }} type="button" role="tab" id={tabId(tab.id)} aria-controls={panelId(tab.id)} aria-selected={selected === tab.id} tabIndex={selected === tab.id ? 0 : -1} onClick={() => setSelected(tab.id)} onKeyDown={(event) => handleTabKey(event, index)} className={`layout-focus min-h-11 min-w-0 rounded-lg px-2 py-3 text-xs font-medium break-words sm:px-4 sm:text-sm ${selected === tab.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'}`}>{tab.label}</button>)}
      </div>
      <section role="tabpanel" id={panelId('general')} aria-labelledby={tabId('general')} hidden={selected !== 'general'} tabIndex={0} className="layout-focus min-w-0 rounded-2xl">
        <Card><CardHeader title="Información general" description="Identificación, ubicación e ingreso de la familia." /><CardBody><dl className="grid min-w-0 gap-x-6 gap-y-5 sm:grid-cols-2">
          {generalFields.map(([label, value]) => <div key={label} className="min-w-0 border-b border-slate-100 pb-4 dark:border-slate-800"><dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900 [overflow-wrap:anywhere] dark:text-slate-100">{value}</dd></div>)}
          <div className="min-w-0 border-b border-slate-100 pb-4 dark:border-slate-800"><dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Estado</dt><dd className="mt-2"><Badge variant={familyStateVariant(family.estado)} className="max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">{family.estado}</Badge></dd></div>
          <div className="min-w-0 sm:col-span-2"><dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Observaciones</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-300">{family.observaciones || 'Sin observaciones'}</dd></div>
        </dl></CardBody></Card>
      </section>
      <section role="tabpanel" id={panelId('members')} aria-labelledby={tabId('members')} hidden={selected !== 'members'} tabIndex={0} className="layout-focus min-w-0 rounded-2xl">
        <Card><CardHeader title="Integrantes" description="Todas las personas asociadas a esta familia. No se calculan edades." /><CardBody>{memberRows.length ? <DataTableContainer columns={['Nombre completo', 'Fecha de nacimiento', 'Sexo', 'Parentesco', 'Teléfono', 'Estado activo']} rows={memberRows} caption="Integrantes de la familia" /> : <EmptyState title="Sin integrantes registrados" description="Esta familia no tiene integrantes asociados en el expediente consultado." />}</CardBody></Card>
      </section>
      <section role="tabpanel" id={panelId('programs')} aria-labelledby={tabId('programs')} hidden={selected !== 'programs'} tabIndex={0} className="layout-focus min-w-0 rounded-2xl">
        <Card><CardHeader title="Programas" description="El ID del programa es distinto del ID de su asociación con la familia." /><CardBody>{programRows.length ? <DataTableContainer columns={['Programa y asociación', 'Fecha de ingreso', 'Fecha de salida', 'Estado de participación', 'Observaciones']} rows={programRows} caption="Programas de la familia" /> : <EmptyState title="Sin programas asociados" description="Esta familia no tiene participaciones en programas en el expediente consultado." />}</CardBody></Card>
      </section>
    </div>
  </div>
}
