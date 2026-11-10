import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Card, { CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Alert from '@/components/ui/Alert'
import Dialog from '@/components/ui/Dialog'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWriteProduction } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { listCycles, type Cycle } from '../services/cyclesService'
import {
  createProduction, listProductions, listProductionUnits, ProductionApiError,
  type Production, type ProductionUnit,
} from '../services/productionService'

const cycleName = (cycle: Cycle) => `${cycle.cultivo.nombre} · ${cycle.huerto.familia.nombreReferencia} · ${cycle.huerto.nombre ?? `Huerto #${cycle.huerto.id}`}`
const dateLabel = (record: Production) => record.fechaCosecha ?? `${record.fechaInicioPeriodo} a ${record.fechaFinPeriodo}`
const MAX_OBSERVATION_CHARS = 500
const MAX_OBSERVATION_WORDS = 100
const MAX_VISIBLE_CYCLES = 8

// El formulario usa la fecha de Guatemala, aunque el navegador tenga otra zona horaria.
function todayInGuatemala(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function normalizeCycleSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
}

const wordCount = (value: string): number => value.match(/\S+/gu)?.length ?? 0

// Conserva el máximo anterior de 100 palabras incluso al pegar texto.
function capObservationWords(value: string): string {
  const words = [...value.matchAll(/\S+/gu)]
  if (words.length <= MAX_OBSERVATION_WORDS) return value
  const last = words[MAX_OBSERVATION_WORDS - 1]
  return value.slice(0, (last.index ?? 0) + last[0].length)
}

export default function ProduccionPage() {
  const { usuario } = useAuth()
  const online = useOnlineStatus()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const allowed = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/produccion'))
  const canReadCycles = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/ciclos'))
  const canCreate = Boolean(canReadCycles && usuario && canWriteProduction(usuario))
  // La consulta se identifica por generación; el estado anterior no se muestra mientras carga otra.
  const [refresh, setRefresh] = useState(0)
  const requestKey = `${usuario?.id ?? 'anon'}:${refresh}`
  const [loaded, setLoaded] = useState<{
    key: string; cycles: Cycle[]; units: ProductionUnit[]; records: Production[]; error: string
  }>({ key: '', cycles: [], units: [], records: [], error: '' })
  const loading = allowed && loaded.key !== requestKey
  const cycles = loaded.key === requestKey ? loaded.cycles : []
  const units = loaded.key === requestKey ? loaded.units : []
  const records = loaded.key === requestKey ? loaded.records : []
  const error = loaded.key === requestKey ? loaded.error : ''
  const [notice, setNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [cycleId, setCycleId] = useState('')
  const [cycleSearch, setCycleSearch] = useState('')
  const [fecha, setFecha] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [unitId, setUnitId] = useState('')
  const [notes, setNotes] = useState('')
  const routeCycle = params.get('cicloId') ?? ''
  // Los filtros se adaptan a una navegación hacia otro ciclo sin setState en useEffect.
  const [filterSelection, setFilterSelection] = useState({ route: routeCycle, value: routeCycle })
  const filterCycle = filterSelection.route === routeCycle ? filterSelection.value : routeCycle
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!allowed) return
    const controller = new AbortController()
    Promise.all([listCycles(undefined, controller.signal), listProductionUnits(controller.signal), listProductions(undefined, controller.signal)])
      .then(([availableCycles, availableUnits, savedRecords]) => {
        if (!controller.signal.aborted) {
          setLoaded({ key: requestKey, cycles: availableCycles, units: availableUnits, records: savedRecords, error: '' })
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setLoaded(prev => ({ ...prev, key: requestKey, error: cause instanceof Error ? cause.message : 'No fue posible consultar la producción.' }))
      })
    return () => controller.abort()
  }, [allowed, requestKey])

  const visible = useMemo(() => records.filter(record => {
    if (filterCycle && record.cicloCultivoId !== Number(filterCycle)) return false
    const target = `${record.cicloCultivo.cultivo.nombre} ${record.cicloCultivo.huerto.nombre ?? ''} ${record.cicloCultivo.huerto.familia.nombreReferencia} ${record.cicloCultivo.huerto.familia.comunidad.nombre}`.toLocaleLowerCase('es')
    return target.includes(search.trim().toLocaleLowerCase('es'))
  }), [records, filterCycle, search])

  // Búsqueda local: no requiere nuevas rutas y mantiene la opción ya seleccionada.
  const matchingCycles = useMemo(() => {
    const query = normalizeCycleSearch(cycleSearch.trim())
    if (!query) return cycles
    return cycles.filter(cycle => normalizeCycleSearch(
      `${cycleName(cycle)} ${cycle.huerto.familia.comunidad.nombre} #${cycle.id} ${cycle.id}`,
    ).includes(query))
  }, [cycles, cycleSearch])
  const selectedCycleOption = cycles.find(cycle => String(cycle.id) === cycleId)
  const selectedUnit = units.find(unit => String(unit.id) === unitId)
  // Mostrar coincidencias directas, sin obligar a abrir un segundo desplegable.
  const visibleCycleMatches = matchingCycles.slice(0, MAX_VISIBLE_CYCLES)

  function selectCycle(id: number) {
    setCycleId(String(id))
    setFieldErrors(previous => ({ ...previous, cicloCultivoId: '' }))
  }

  function startRegistration() {
    setCycleId(filterCycle)
    setCycleSearch('')
    setFecha(todayInGuatemala()); setCantidad(''); setUnitId(''); setNotes('')
    setSubmitError(''); setFieldErrors({}); setModalOpen(true)
  }
  function closeRegistration() { if (!saving) setModalOpen(false) }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !online) return
    const fields: Record<string, string> = {}
    const selectedCycle = cycles.find(item => item.id === Number(cycleId))
    if (!selectedCycle) fields.cicloCultivoId = 'Selecciona un ciclo de cultivo.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) fields.fechaCosecha = 'Ingresa la fecha de cosecha.'
    if (selectedCycle && fecha) {
      if (selectedCycle.fechaSiembra && fecha < selectedCycle.fechaSiembra) fields.fechaCosecha = 'La cosecha no puede ser anterior a la fecha de inicio de la siembra.'
      if (selectedCycle.fechaFin && fecha > selectedCycle.fechaFin) fields.fechaCosecha = 'La fecha supera el cierre del ciclo.'
    }
    if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(cantidad) || Number(cantidad) <= 0) fields.cantidad = 'Ingresa una cantidad positiva, máximo tres decimales.'
    else if (selectedUnit?.tipo !== 'kg' && !/^\d{1,9}$/.test(cantidad)) fields.cantidad = 'Unidades y manojos requieren números enteros.'
    if (!units.some(item => item.id === Number(unitId))) fields.unidadMedidaId = 'Selecciona una unidad de medida.'
    if (notes.length > MAX_OBSERVATION_CHARS) fields.observaciones = 'Máximo 500 caracteres.'
    else if (wordCount(notes) > MAX_OBSERVATION_WORDS) fields.observaciones = 'Máximo 100 palabras.'
    setFieldErrors(fields)
    if (Object.keys(fields).length) return
    setSaving(true); setSubmitError('')
    try {
      const saved = await createProduction({
        cicloCultivoId: Number(cycleId), fechaCosecha: fecha, cantidad,
        unidadMedidaId: Number(unitId), observaciones: notes.trim() || null,
      })
      setLoaded(old => ({ ...old, records: [saved, ...old.records] }))
      setModalOpen(false)
      setNotice('Cosecha registrada correctamente y vinculada al ciclo agrícola.')
    } catch (cause) {
      if (cause instanceof ProductionApiError) {
        setSubmitError(cause.message)
        setFieldErrors(Object.fromEntries(cause.details.map(({ field, message }) => [field, message])))
      } else setSubmitError('No se pudo confirmar el guardado. Revisa el historial antes de volver a intentar.')
    } finally { setSaving(false) }
  }

  if (!allowed) return <Alert variant="error" title="Acceso restringido">No tienes permiso para consultar producción agrícola.</Alert>
  return <>
    <PageMeta title="Producción agrícola | ViviendasLeón" description="Registro de cosechas vinculadas a ciclos agrícolas." />
    <PageHeader title="Cosechas reales" description="Registro formal de producción agrícola por ciclo." />
    {!online && <Alert variant="warning" title="Sin conexión">Puedes consultar la información ya visible, pero registrar una cosecha requiere conexión. Este módulo todavía no dispone de sincronización offline.</Alert>}
    {notice && <Alert variant="success">{notice}</Alert>}
    {error && <Alert variant="error" title="No se pudo cargar">{error}<Button type="button" variant="secondary" className="mt-3" onClick={() => setRefresh(n => n + 1)}>Reintentar</Button></Alert>}
    <Card>
      <CardBody>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historial de cosechas</h2><p className="text-sm text-slate-500">{records.length} registro(s) consultados. Las cantidades se muestran con su unidad original.</p></div>
          {canCreate && <Button type="button" onClick={startRegistration} disabled={loading || !online || cycles.length === 0 || units.length === 0}>+ Registrar cosecha</Button>}
        </div>
        {!loading && !error && canCreate && !units.length && <Alert variant="warning" title="Sin unidades disponibles">No hay unidades de medida activas. Aplica la migración AGR-05 para habilitar kilogramos, libras, unidades y manojos.</Alert>}
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <FormField id="production-filter-cycle" label="Filtrar por ciclo">
            <select id="production-filter-cycle" className={formControlClassName} value={filterCycle} onChange={event => setFilterSelection({ route: routeCycle, value: event.target.value })}>
              <option value="">Todos los ciclos</option>
              {cycles.map(cycle => <option key={cycle.id} value={cycle.id}>{cycleName(cycle)} · #{cycle.id}</option>)}
            </select>
          </FormField>
          <FormField id="production-filter-search" label="Buscar por cultivo, familia o comunidad">
            <input id="production-filter-search" className={formControlClassName} value={search} onChange={event => setSearch(event.target.value)} placeholder="Ej. Tomate" />
          </FormField>
        </div>
        {loading && <LoadingState label="Consultando registros de producción..." />}
        {!loading && !error && visible.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No hay cosechas registradas para los filtros seleccionados.</p>}
        {!loading && !error && visible.length > 0 && <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800"><tr>
              <th className="px-3 py-3 font-medium">Cultivo y ciclo</th><th className="px-3 py-3 font-medium">Familia / huerto</th>
              <th className="px-3 py-3 font-medium">Fecha de cosecha / período</th><th className="px-3 py-3 font-medium">Producción</th>
            </tr></thead>
            <tbody>{visible.map(record => <tr key={record.id}
              className={`border-b border-slate-100 align-top dark:border-slate-800 ${canReadCycles ? 'cursor-pointer transition-colors hover:bg-brand-50/60 focus-visible:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 dark:hover:bg-white/5 dark:focus-visible:bg-white/5' : ''}`}
              role={canReadCycles ? 'link' : undefined}
              tabIndex={canReadCycles ? 0 : undefined}
              aria-label={canReadCycles ? `Abrir seguimiento de ${record.cicloCultivo.cultivo.nombre}, ciclo #${record.cicloCultivoId}` : undefined}
              onClick={canReadCycles ? () => navigate(`/gestion-agricola/ciclos/${record.cicloCultivoId}`) : undefined}
              onKeyDown={canReadCycles ? event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate(`/gestion-agricola/ciclos/${record.cicloCultivoId}`)
                }
              } : undefined}>
              <td className="px-3 py-4"><span className="font-medium text-slate-900 dark:text-white">{record.cicloCultivo.cultivo.nombre}</span><p className="mt-1 text-xs text-slate-500">Ciclo #{record.cicloCultivoId} · <Badge>{record.cicloCultivo.estado}</Badge></p>{canReadCycles && <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-400">Ver seguimiento del ciclo</p>}</td>
              <td className="px-3 py-4">{record.cicloCultivo.huerto.familia.nombreReferencia}<p className="text-xs text-slate-500">{record.cicloCultivo.huerto.nombre ?? `Huerto #${record.cicloCultivo.huerto.id}`} · {record.cicloCultivo.huerto.familia.comunidad.nombre}</p></td>
              <td className="px-3 py-4">{dateLabel(record)}</td>
              <td className="px-3 py-4">{record.detalles.map(detail => <div key={detail.id} className="font-medium">{detail.cantidadTotal} {detail.unidadMedida.abreviatura ?? detail.unidadMedida.nombre}</div>)}{record.observaciones && <p className="mt-1 text-xs font-normal text-slate-500">{record.observaciones}</p>}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        <p className="mt-5 text-xs text-slate-500">Consulta limitada a los 500 registros más recientes. Para sumar producción, agrupa por unidad de medida o aplica conversiones verificadas en el módulo de reportes.</p>
        <Link to="/gestion-agricola/ciclos" className="mt-3 inline-block text-sm text-brand-600 underline">Ver ciclos agrícolas</Link>
      </CardBody>
    </Card>
    <Dialog open={modalOpen} title="Registrar cosecha" description="Asocia la cantidad cosechada a un ciclo y su unidad de medida." onClose={closeRegistration}>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        {submitError && <Alert variant="error" title="No se pudo registrar">{submitError}</Alert>}
        <FormField id="harvest-cycle-search" label="Buscar ciclo de cultivo" required error={fieldErrors.cicloCultivoId}
          hint="Escribe un cultivo, huerto, familia o ID y elige un resultado.">
          <input id="harvest-cycle-search" type="search" autoComplete="off" className={formControlClassName} value={cycleSearch}
            aria-controls="harvest-cycle-results" onChange={event => setCycleSearch(event.target.value)} placeholder="Ej. tomate, huerto o familia" />
        </FormField>
        {selectedCycleOption && <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
          <div className="min-w-0"><p className="text-xs font-semibold text-brand-700 dark:text-brand-300">Ciclo seleccionado</p>
            <p className="break-words font-medium text-gray-800 dark:text-white">{cycleName(selectedCycleOption)} · #{selectedCycleOption.id}</p></div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCycleId('')}>Cambiar</Button>
        </div>}
        <div id="harvest-cycle-results" role="group" aria-label="Resultados de ciclos de cultivo" className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-1 dark:border-gray-700">
          {visibleCycleMatches.map(cycle => <div key={cycle.id}
            className={`flex items-center gap-1 rounded-lg ${cycleId === String(cycle.id) ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            <button type="button" aria-pressed={cycleId === String(cycle.id)} onClick={() => selectCycle(cycle.id)}
              className="layout-focus flex min-h-12 min-w-0 flex-1 flex-col items-start justify-center rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-brand-500">
              <span className="font-semibold text-gray-900 dark:text-white">{cycle.cultivo.nombre} · Ciclo #{cycle.id} {cycleId === String(cycle.id) ? '✓' : ''}</span>
              <span className="break-words text-xs text-gray-500 dark:text-gray-400">{cycle.huerto.familia.nombreReferencia} · {cycle.huerto.nombre ?? `Huerto #${cycle.huerto.id}`} · {cycle.estado}</span>
            </button>
            <Link to={`/gestion-agricola/ciclos/${cycle.id}`} target="_blank" rel="noopener noreferrer"
              className="layout-focus shrink-0 rounded-lg px-2 py-3 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
              aria-label={`Ver seguimiento del ciclo #${cycle.id} en otra pestaña`}>Ver seguimiento</Link>
          </div>)}
          {matchingCycles.length === 0 && <p role="status" className="px-3 py-4 text-sm text-gray-500">No hay ciclos que coincidan con la búsqueda.</p>}
        </div>
        <p className="text-xs text-gray-500" role="status">
          {matchingCycles.length > MAX_VISIBLE_CYCLES
            ? `Se muestran ${MAX_VISIBLE_CYCLES} de ${matchingCycles.length} coincidencias. Escribe más para precisar.`
            : `${matchingCycles.length} ciclo(s) coincidentes.`}
          {cycles.length === 500 ? ' La consulta solo incluye los 500 ciclos más recientes.' : ''}
        </p>
        <FormField id="harvest-date" label="Fecha de cosecha" required error={fieldErrors.fechaCosecha} hint="Fecha de hoy preseleccionada; puedes cambiarla.">
          <input id="harvest-date" type="date" required className={formControlClassName} value={fecha} onChange={event => setFecha(event.target.value)} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="harvest-amount" label="Cantidad cosechada" required error={fieldErrors.cantidad}>
            <input id="harvest-amount" required type="number" min={selectedUnit?.tipo === 'kg' ? '0.001' : '1'} max={selectedUnit?.tipo === 'kg' ? '999999999.999' : '999999999'} step={selectedUnit?.tipo === 'kg' ? '0.001' : '1'} className={formControlClassName} value={cantidad} onChange={event => setCantidad(event.target.value)} placeholder={selectedUnit?.tipo === 'kg' ? 'Ej. 25.500' : 'Ej. 25'} />
          </FormField>
          <FormField id="harvest-unit" label="Unidad de medida" required error={fieldErrors.unidadMedidaId}>
            <select id="harvest-unit" required className={formControlClassName} value={unitId} onChange={event => setUnitId(event.target.value)}>
              <option value="">Selecciona una unidad</option>
              {units.map(unit => <option key={unit.id} value={unit.id}>{unit.nombre} ({unit.abreviatura ?? unit.codigo})</option>)}
            </select>
          </FormField>
        </div>
        {selectedUnit && <p className="text-xs text-gray-500">{selectedUnit.tipo === 'kg'
          ? 'Kilogramos: hasta tres decimales.' : 'Unidades y manojos: números enteros.'} No se convierten automáticamente entre unidades.</p>}
        <FormField id="harvest-notes" label="Observaciones" error={fieldErrors.observaciones}
          hint={`${notes.length} / ${MAX_OBSERVATION_CHARS} caracteres · ${wordCount(notes)} / ${MAX_OBSERVATION_WORDS} palabras`}>
          <textarea id="harvest-notes" rows={3} maxLength={MAX_OBSERVATION_CHARS} className={formControlClassName}
            value={notes} onChange={event => setNotes(capObservationWords(event.target.value))} />
        </FormField>
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button type="button" variant="secondary" disabled={saving} onClick={closeRegistration}>Cancelar</Button>
          <Button type="submit" disabled={saving || !online}>{saving ? 'Guardando...' : 'Guardar cosecha'}</Button>
        </div>
      </form>
    </Dialog>
  </>
}
