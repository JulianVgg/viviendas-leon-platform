import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
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

export default function ProduccionPage() {
  const { usuario } = useAuth()
  const online = useOnlineStatus()
  const [params] = useSearchParams()
  const allowed = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/produccion'))
  const canCreate = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/ciclos') && canWriteProduction(usuario))
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

  function startRegistration() {
    setCycleId(filterCycle)
    setFecha(''); setCantidad(''); setUnitId(''); setNotes('')
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
      const start = [selectedCycle.fechaSiembra, selectedCycle.fechaTrasplante].filter((d): d is string => Boolean(d)).sort().at(-1)
      if (start && fecha < start) fields.fechaCosecha = 'La cosecha no puede ser anterior a la siembra o trasplante.'
      if (selectedCycle.fechaFin && fecha > selectedCycle.fechaFin) fields.fechaCosecha = 'La fecha supera el cierre del ciclo.'
    }
    if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(cantidad) || Number(cantidad) <= 0) fields.cantidad = 'Ingresa una cantidad positiva, máximo tres decimales.'
    if (!units.some(item => item.id === Number(unitId))) fields.unidadMedidaId = 'Selecciona una unidad de medida.'
    if (notes.length > 2000) fields.observaciones = 'Máximo 2000 caracteres.'
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
    <PageHeader title="Producción agrícola" description="Registra resultados de cosecha, consulta su historial y conserva las cantidades para futuros reportes." />
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
            <tbody>{visible.map(record => <tr key={record.id} className="border-b border-slate-100 align-top dark:border-slate-800">
              <td className="px-3 py-4"><span className="font-medium text-slate-900 dark:text-white">{record.cicloCultivo.cultivo.nombre}</span><p className="mt-1 text-xs text-slate-500">Ciclo #{record.cicloCultivoId} · <Badge>{record.cicloCultivo.estado}</Badge></p></td>
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
        <FormField id="harvest-cycle" label="Ciclo de cultivo" required error={fieldErrors.cicloCultivoId}>
          <select id="harvest-cycle" required className={formControlClassName} value={cycleId} onChange={event => setCycleId(event.target.value)}>
            <option value="">Selecciona el ciclo</option>
            {cycles.map(cycle => <option key={cycle.id} value={cycle.id}>{cycleName(cycle)} · {cycle.estado} · #{cycle.id}</option>)}
          </select>
        </FormField>
        <FormField id="harvest-date" label="Fecha de cosecha" required error={fieldErrors.fechaCosecha}>
          <input id="harvest-date" type="date" required className={formControlClassName} value={fecha} onChange={event => setFecha(event.target.value)} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="harvest-amount" label="Cantidad producida" required error={fieldErrors.cantidad}>
            <input id="harvest-amount" required type="number" min="0.001" max="999999999.999" step="0.001" className={formControlClassName} value={cantidad} onChange={event => setCantidad(event.target.value)} placeholder="Ej. 25.5" />
          </FormField>
          <FormField id="harvest-unit" label="Unidad de medida" required error={fieldErrors.unidadMedidaId}>
            <select id="harvest-unit" required className={formControlClassName} value={unitId} onChange={event => setUnitId(event.target.value)}>
              <option value="">Selecciona una unidad</option>
              {units.map(unit => <option key={unit.id} value={unit.id}>{unit.nombre} ({unit.abreviatura ?? unit.codigo})</option>)}
            </select>
          </FormField>
        </div>
        <FormField id="harvest-notes" label="Observaciones" error={fieldErrors.observaciones}>
          <textarea id="harvest-notes" rows={3} maxLength={2000} className={formControlClassName} value={notes} onChange={event => setNotes(event.target.value)} />
        </FormField>
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button type="button" variant="secondary" disabled={saving} onClick={closeRegistration}>Cancelar</Button>
          <Button type="submit" disabled={saving || !online}>{saving ? 'Guardando...' : 'Guardar cosecha'}</Button>
        </div>
      </form>
    </Dialog>
  </>
}
