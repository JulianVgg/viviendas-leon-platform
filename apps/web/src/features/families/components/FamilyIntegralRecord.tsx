import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Pencil, Plus, Power } from 'lucide-react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import DataTableContainer from '@/components/common/DataTableContainer'
import EmptyState from '@/components/common/EmptyState'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/AuthProvider'
import { canWriteFamilies } from '@/features/auth/screenPermissions'
import { familyStateVariant, formatRecordDate } from '../services/familyRecord'
import { FamilyApiError, updateFamilyMemberState } from '../services/familyService'
import type { FamilyMemberRecord, IntegralFamilyRecord } from '../types/familyIntegral'
import FamilyMemberDialog from './FamilyMemberDialog'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import FamilyProgramHistory from './FamilyProgramHistory'
import FamilyGardensSection from '@/features/agriculture/components/FamilyGardensSection'

const tabs = [
  { id: 'general', label: 'Información general' },
  { id: 'members', label: 'Integrantes' },
  { id: 'programs', label: 'Programas' },
  { id: 'gardens', label: 'Huertos y cultivos' },
] as const
type RecordTab = typeof tabs[number]['id']
const textClass = 'block min-w-0 max-w-80 whitespace-pre-wrap break-words [overflow-wrap:anywhere]'

export default function FamilyIntegralRecord({ family, onRefresh }: { family: IntegralFamilyRecord; onRefresh: () => Promise<IntegralFamilyRecord> }) {
  const { usuario } = useAuth()
  const canManage = Boolean(usuario && canWriteFamilies(usuario))
  const isOnline = useOnlineStatus()
  const instanceId = useId()
  const [params] = useSearchParams()
  const [selected, setSelected] = useState<RecordTab>(params.get('tab') === 'gardens' ? 'gardens' : 'general')
  const [memberDialog, setMemberDialog] = useState<{ member?: FamilyMemberRecord }>()
  const [stateMember, setStateMember] = useState<FamilyMemberRecord>()
  const [stateSaving, setStateSaving] = useState(false)
  const [memberError, setMemberError] = useState<string>()
  const [memberNotice, setMemberNotice] = useState<string>()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const tabId = (tab: RecordTab) => `family-record-${instanceId}-${tab}-tab`
  const panelId = (tab: RecordTab) => `family-record-${instanceId}-${tab}-panel`

  const members = family.integrantes

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
  function initials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  }

  async function replaceMember(updated: FamilyMemberRecord) {
    setMemberDialog(undefined); setStateMember(undefined); setMemberError(undefined)
    setMemberNotice('La operación se confirmó y el expediente se actualizó desde el servidor.')
    try { await onRefresh() }
    catch { setMemberNotice(`La operación sobre ${updated.nombreCompleto} fue confirmada, pero no se pudo refrescar el expediente. Recarga la página antes de continuar.`) }
  }

  async function changeMemberState() {
    if (!stateMember || stateSaving) return
    if (!isOnline) { setMemberError('Se requiere conexión con el servidor para cambiar el estado.'); return }
    setStateSaving(true); setMemberError(undefined)
    try { await replaceMember(await updateFamilyMemberState(family.id, stateMember.id, !stateMember.activo, stateMember.version)) }
    catch (cause) { setMemberError(cause instanceof FamilyApiError ? cause.message : 'No fue posible cambiar el estado del integrante.') }
    finally { setStateSaving(false) }
  }

  const memberRows = members.map((member, index) => [
    <div key={`name-${member.id}`} className="flex min-w-48 items-center gap-3"><span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${index % 2 ? 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300' : 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'}`}>{initials(member.nombreCompleto)}</span><span className={`${textClass} font-medium text-slate-900 dark:text-slate-100`}>{member.nombreCompleto}</span></div>,
    formatRecordDate(member.fechaNacimiento),
    <span key={`sex-${member.id}`} className={textClass}>{member.sexo || 'No indicado'}</span>,
    <span key={`relationship-${member.id}`} className={textClass}>{member.parentesco || 'No indicado'}</span>,
    <span key={`phone-${member.id}`} className={textClass}>{member.telefono || 'Sin teléfono'}</span>,
    <Badge key={`active-${member.id}`} variant={member.activo ? 'success' : 'neutral'}>{member.activo ? 'Activo' : 'Inactivo'}</Badge>,
    canManage ? <div key={`actions-${member.id}`} className="flex min-w-48 flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" onClick={() => setMemberDialog({ member })}><Pencil size={15} />Editar</Button><Button type="button" size="sm" variant={member.activo ? 'danger' : 'secondary'} disabled={!isOnline} onClick={() => { setMemberError(undefined); setStateMember(member) }}><Power size={15} />{member.activo ? 'Desactivar' : 'Reactivar'}</Button></div> : <span key={`actions-${member.id}`} className="text-xs text-gray-500">Solo lectura</span>,
  ])
  return <div className="min-w-0 space-y-6">
    <Card aria-label="Identificación del expediente">
      <CardBody><div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Expediente #{family.id}{canManage ? ' · Administración habilitada' : ' · Solo lectura'}</p><h2 className="mt-2 break-words text-xl font-semibold text-slate-900 [overflow-wrap:anywhere] sm:text-2xl dark:text-white">{family.nombreReferencia}</h2><p className="mt-2 break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{family.comunidad.nombre} · {family.comunidad.municipio.nombre}</p>{canManage && <Link to={`/familias/${family.id}/editar`} className="layout-focus mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"><Pencil size={16} />Editar información</Link>}</div>
        <div className="min-w-0 sm:max-w-64"><p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Estado de la familia</p><Badge variant={familyStateVariant(family.estado)} className="max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">{family.estado}</Badge></div>
      </div></CardBody>
    </Card>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Card aria-label="Resumen de integrantes"><CardBody><p className="text-sm font-medium text-slate-600 dark:text-slate-300">Integrantes registrados</p><p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">{members.length}</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{members.filter(({ activo }) => activo).length} activos · {members.filter(({ activo }) => !activo).length} inactivos.</p></CardBody></Card>
      <Card aria-label="Resumen de programas"><CardBody><p className="text-sm font-medium text-slate-600 dark:text-slate-300">Programas asociados</p><p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">{family.programas.length}</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Participaciones registradas en el expediente.</p></CardBody></Card>
    </div>
    <div className="min-w-0 space-y-5">
      <div role="tablist" aria-label="Secciones del expediente familiar" aria-orientation="horizontal" className="grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
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
        <Card><CardHeader title="Integrantes" description="Personas activas e inactivas asociadas a esta familia." actions={canManage ? <Button type="button" size="sm" onClick={() => { setMemberNotice(undefined); setMemberDialog({}) }}><Plus size={16} />Agregar integrante</Button> : undefined} /><CardBody>{canManage && !isOnline && <Alert variant="warning" title="Sin conexión" className="mb-4">Las escrituras están deshabilitadas hasta recuperar conexión con el servidor.</Alert>}{memberNotice && <Alert variant="success" title="Expediente actualizado" className="mb-4">{memberNotice}</Alert>}{memberError && <Alert variant="error" title="No se pudo cambiar el estado" className="mb-4">{memberError}</Alert>}{memberRows.length ? <DataTableContainer columns={['Nombre completo', 'Fecha de nacimiento', 'Sexo', 'Parentesco', 'Teléfono', 'Estado', 'Acciones']} rows={memberRows} caption="Integrantes de la familia" /> : <EmptyState title="Sin integrantes registrados" description="Esta familia no tiene integrantes asociados en el expediente consultado." action={canManage ? <Button type="button" onClick={() => setMemberDialog({})}>Agregar integrante</Button> : undefined} />}</CardBody></Card>
      </section>
      <section role="tabpanel" id={panelId('programs')} aria-labelledby={tabId('programs')} hidden={selected !== 'programs'} tabIndex={0} className="layout-focus min-w-0 rounded-2xl">
        <FamilyProgramHistory participations={family.programas} />
      </section>
      <section role="tabpanel" id={panelId('gardens')} aria-labelledby={tabId('gardens')} hidden={selected !== 'gardens'} tabIndex={0} className="layout-focus min-w-0 rounded-2xl">
        {selected === 'gardens' && <FamilyGardensSection familyId={family.id} />}
      </section>
      {memberDialog && <FamilyMemberDialog familyId={family.id} member={memberDialog.member} onClose={() => setMemberDialog(undefined)} onSaved={replaceMember} />}
      {stateMember && <Dialog open title={stateMember.activo ? 'Desactivar integrante' : 'Reactivar integrante'} description={`${stateMember.nombreCompleto} · Expediente #${family.id}`} onClose={() => { if (!stateSaving) setStateMember(undefined) }} actions={<><Button type="button" variant="secondary" disabled={stateSaving} onClick={() => setStateMember(undefined)}>Cancelar</Button><Button type="button" variant={stateMember.activo ? 'danger' : 'primary'} disabled={stateSaving || !isOnline} onClick={changeMemberState}>{stateMember.activo ? 'Confirmar desactivación' : 'Confirmar reactivación'}</Button></>}><p className="text-sm leading-6">{stateMember.activo ? 'El integrante quedará inactivo, pero conservará todas sus relaciones históricas. La familia debe mantener al menos un integrante activo.' : 'El integrante volverá a mostrarse como activo en el expediente.'}</p>{!isOnline && <Alert variant="warning" className="mt-4">Reconecta antes de confirmar esta operación.</Alert>}{memberError && <Alert variant="error" className="mt-4">{memberError}</Alert>}</Dialog>}
    </div>
  </div>
}
