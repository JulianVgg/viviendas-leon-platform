import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Card, { CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Dialog from '@/components/ui/Dialog'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import type { Production } from '../services/productionService'
import { calculateSalePreview } from '../services/salesMoney'
import {
  createSale, listSaleCurrencies, listSales, saleAvailability, SaleApiError,
  type Sale, type SaleAvailability, type SaleCurrency,
} from '../services/salesService'

type Props = { records: Production[]; canCreate: boolean; online: boolean; loadingProductions: boolean }
const today = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (key: string) => parts.find(item => item.type === key)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
const label = (sale: Sale) => `${sale.cicloCultivo.cultivo.nombre} · ${sale.cicloCultivo.huerto.familia.nombreReferencia}`

export default function SalesPanel({ records, canCreate, online, loadingProductions }: Props) {
  const [refresh, setRefresh] = useState(0)
  const [loaded, setLoaded] = useState<{ key: number; sales: Sale[]; currencies: SaleCurrency[]; error: string }>(
    { key: -1, sales: [], currencies: [], error: '' },
  )
  const loading = loaded.key !== refresh
  const sales = loaded.key === refresh ? loaded.sales : []
  const currencies = loaded.key === refresh ? loaded.currencies : []
  const error = loaded.key === refresh ? loaded.error : ''
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const [availability, setAvailability] = useState<SaleAvailability | null>(null)
  const [availabilityError, setAvailabilityError] = useState('')
  const [fechaVenta, setFechaVenta] = useState('')
  const [unidad, setUnidad] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [moneda, setMoneda] = useState('')
  const [precio, setPrecio] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([listSales(controller.signal), listSaleCurrencies(controller.signal)])
      .then(([savedSales, savedCurrencies]) => {
        if (!controller.signal.aborted) setLoaded({ key: refresh, sales: savedSales, currencies: savedCurrencies, error: '' })
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setLoaded({ key: refresh, sales: [], currencies: [], error:
          cause instanceof Error ? cause.message : 'No se pudieron consultar las ventas.' })
      })
    return () => controller.abort()
  }, [refresh])

  useEffect(() => {
    if (!open || !selected) return
    const controller = new AbortController()
    saleAvailability(Number(selected), controller.signal)
      .then(data => { if (!controller.signal.aborted) { setAvailability(data); setAvailabilityError('') } })
      .catch((cause: unknown) => { if (!controller.signal.aborted) {
        setAvailability(null); setAvailabilityError(cause instanceof Error ? cause.message : 'No se pudo comprobar el saldo.')
      } })
    return () => controller.abort()
  }, [selected, open])

  const selectedProduction = records.find(record => String(record.id) === selected)
  const selectedBalance = availability?.unidades.find(row => String(row.unidadMedida.id) === unidad)
  const selectedCurrency = currencies.find(item => String(item.id) === moneda)
  const salePreview = useMemo(() => {
    return calculateSalePreview(cantidad, precio)
  }, [cantidad, precio])

  function start() {
    setSelected(''); setAvailability(null); setAvailabilityError(''); setFechaVenta(today())
    setUnidad(''); setCantidad(''); setMoneda(''); setPrecio(''); setObservaciones('')
    setSubmitError(''); setFieldErrors({}); setOpen(true)
  }
  function close() { if (!saving) setOpen(false) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !online) return
    const errors: Record<string, string> = {}
    if (!selectedProduction || !availability) errors.registroProduccionId = 'Selecciona una cosecha registrada.'
    if (!selectedBalance) errors.unidadMedidaId = 'Selecciona una unidad disponible.'
    if (!/^(?:\d{4})-\d{2}-\d{2}$/.test(fechaVenta) || fechaVenta > today() ||
      (selectedProduction && fechaVenta < selectedProduction.fechaInicioPeriodo)) errors.fechaVenta = 'Fecha no válida para esta cosecha.'
    if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(cantidad) || Number(cantidad) <= 0 ||
      (selectedBalance && Number(cantidad) > Number(selectedBalance.disponible))) errors.cantidad = 'Cantidad positiva, dentro de lo disponible.'
    if (selectedBalance && selectedBalance.tipo !== 'kg' && !/^\d{1,9}$/.test(cantidad)) {
      errors.cantidad = 'Las unidades y manojos requieren cantidades enteras.'
    }
    if (!selectedCurrency) errors.monedaId = 'Selecciona una moneda.'
    if (!/^\d{1,9}(?:\.\d{1,4})?$/.test(precio) || Number(precio) <= 0 ||
      !salePreview || Number(salePreview) <= 0) errors.precioUnitario = 'Ingresa un precio positivo válido.'
    if (observaciones.length > 500 || (observaciones.match(/\S+/gu)?.length ?? 0) > 100) errors.observaciones = 'Máximo 500 caracteres y 100 palabras.'
    setFieldErrors(errors)
    if (Object.keys(errors).length || !selectedProduction || !selectedBalance || !selectedCurrency) return
    setSaving(true); setSubmitError('')
    try {
      await createSale({ registroProduccionId: selectedProduction.id, fechaVenta, cantidad,
        unidadMedidaId: selectedBalance.unidadMedida.id, monedaId: selectedCurrency.id,
        precioUnitario: precio, observaciones: observaciones.trim() || null })
      setOpen(false); setNotice('Venta real registrada correctamente.'); setRefresh(value => value + 1)
    } catch (cause) {
      if (cause instanceof SaleApiError) {
        setSubmitError(cause.message)
        setFieldErrors(Object.fromEntries(cause.details.map(({ field, message }) => [field, message])))
        if (cause.status === 409) {
          setAvailability(null)
          try { setAvailability(await saleAvailability(selectedProduction.id)) } catch { setAvailabilityError('Actualiza la pantalla para consultar el saldo.') }
        }
      } else setSubmitError('No se pudo confirmar el guardado. Revisa el historial antes de reintentar.')
    } finally { setSaving(false) }
  }

  return <>
    <Card>
      <CardBody>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ventas agrícolas</h2>
            <p className="text-sm text-slate-500">Ventas efectivas vinculadas a cosechas reales.</p></div>
          {canCreate && <Button onClick={start} disabled={loading || loadingProductions || !online || !records.length || !currencies.length}>
            + Registrar venta
          </Button>}
        </div>
        {!online && <Alert variant="warning">Para registrar una venta necesitas conexión.</Alert>}
        {!loading && !error && canCreate && !currencies.length && <Alert variant="warning" title="Monedas no disponibles">
          El catálogo de monedas oficiales aún no está habilitado. Ejecuta el procedimiento CIR-09 antes de registrar ventas.
        </Alert>}
        {notice && <Alert variant="success">{notice}</Alert>}
        {error && <Alert variant="error" title="No se pudieron cargar las ventas">{error}
          <Button type="button" variant="secondary" className="mt-2" onClick={() => setRefresh(value => value + 1)}>Reintentar</Button></Alert>}
        {loading && <p role="status" className="py-5 text-sm text-slate-500">Consultando ventas...</p>}
        {!loading && !error && sales.length === 0 && <p className="py-5 text-sm text-slate-500">Aún no se han registrado ventas.</p>}
        {!loading && !error && sales.length > 0 && <div className="overflow-x-auto">
          <table className="w-full min-w-[660px] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800"><tr>
              <th className="px-3 py-3 font-medium">Cultivo / familia</th><th className="px-3 py-3 font-medium">Fecha</th>
              <th className="px-3 py-3 font-medium">Cantidad vendida</th><th className="px-3 py-3 font-medium">Precio unitario</th>
              <th className="px-3 py-3 font-medium">Total</th>
            </tr></thead>
            <tbody>{sales.map(sale => <tr key={sale.id} className="border-b border-slate-100 align-top dark:border-slate-800">
              <td className="px-3 py-3 font-medium">{label(sale)}
                {sale.visitaOrigenId && <p className="text-xs font-normal text-slate-500">Registrada en visita #{sale.visitaOrigenId}</p>}
                {sale.esDatoPrueba && <p className="text-xs text-amber-700">Registro de prueba / incompleto</p>}
                {sale.observaciones && <p className="mt-1 text-xs font-normal text-slate-500">{sale.observaciones}</p>}</td>
              <td className="px-3 py-3">{sale.fechaVenta ?? 'Sin fecha'}</td>
              <td className="px-3 py-3">{sale.cantidad} {sale.unidadMedida.abreviatura ?? sale.unidadMedida.nombre}</td>
              <td className="px-3 py-3">{sale.precioUnitario ?? '—'} {sale.moneda?.codigo ?? ''}</td>
              <td className="px-3 py-3 font-semibold">{sale.moneda?.simbolo ?? ''} {sale.totalVenta ?? '—'} {sale.moneda?.codigo ?? ''}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        <p className="mt-3 text-xs text-slate-500">Las ventas están separadas de las estimaciones de visitas. Los importes se conservan en su moneda original, sin convertir GTQ a USD. Consulta limitada a 500 registros recientes.</p>
      </CardBody>
    </Card>
    <Dialog open={open} title="Registrar venta real" description="Selecciona una cosecha y registra la cantidad efectivamente vendida." onClose={close}>
      <form onSubmit={event => void submit(event)} className="space-y-4">
        {submitError && <Alert variant="error" title="No se pudo registrar">{submitError}</Alert>}
        <FormField id="sale-production" label="Cosecha registrada" required error={fieldErrors.registroProduccionId}>
          <select id="sale-production" required className={formControlClassName} value={selected} onChange={event => {
            setSelected(event.target.value); setAvailability(null); setAvailabilityError(''); setUnidad(''); setCantidad('')
          }}>
            <option value="">Selecciona una cosecha</option>
            {records.map(record => <option key={record.id} value={record.id}>
              #{record.id} · {record.cicloCultivo.cultivo.nombre} · {record.cicloCultivo.huerto.familia.nombreReferencia} · {record.fechaFinPeriodo}
            </option>)}
          </select>
        </FormField>
        {selected && !availability && !availabilityError && <p className="text-xs text-slate-500">Consultando cantidad disponible...</p>}
        {availabilityError && <Alert variant="error">{availabilityError}</Alert>}
        {selected && availability && availability.unidades.length === 0 && <Alert variant="warning">Esta cosecha no tiene unidades oficiales disponibles para venta.</Alert>}
        <FormField id="sale-date" label="Fecha de venta" required error={fieldErrors.fechaVenta}>
          <input id="sale-date" type="date" required max={today()} min={selectedProduction?.fechaFinPeriodo} className={formControlClassName}
            value={fechaVenta} onChange={event => setFechaVenta(event.target.value)}/>
        </FormField>
        <FormField id="sale-unit" label="Unidad de venta" required error={fieldErrors.unidadMedidaId}>
          <select id="sale-unit" required className={formControlClassName} value={unidad} onChange={event => setUnidad(event.target.value)}>
            <option value="">Selecciona una unidad</option>
            {availability?.unidades.filter(row => Number(row.disponible) > 0).map(row => <option key={row.unidadMedida.id} value={row.unidadMedida.id}>
              {row.unidadMedida.nombre} · disponible {row.disponible} {row.unidadMedida.abreviatura ?? ''}
            </option>)}
          </select>
        </FormField>
        {selectedBalance && <p className="text-xs text-slate-500">Cosechado: {selectedBalance.cosechado} · vendido: {selectedBalance.vendido} · disponible: {selectedBalance.disponible}. No se convierten unidades.</p>}
        <FormField id="sale-quantity" label="Cantidad vendida" required error={fieldErrors.cantidad}>
          <input id="sale-quantity" required type="number" min={selectedBalance?.tipo === 'kg' ? '0.001' : '1'} max={selectedBalance?.disponible} step={selectedBalance?.tipo === 'kg' ? '0.001' : '1'} className={formControlClassName}
            value={cantidad} onChange={event => setCantidad(event.target.value)} placeholder="Ej. 5" />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="sale-currency" label="Moneda" required error={fieldErrors.monedaId}>
            <select id="sale-currency" required className={formControlClassName} value={moneda} onChange={event => setMoneda(event.target.value)}>
              <option value="">Selecciona</option>
              {currencies.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
            </select>
          </FormField>
          <FormField id="sale-unit-price" label="Precio por unidad" required error={fieldErrors.precioUnitario}>
            <input id="sale-unit-price" type="number" min="0.0001" step="any" required className={formControlClassName}
              value={precio} onChange={event => setPrecio(event.target.value)} placeholder="Ej. 10.50"/>
          </FormField>
        </div>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
          Importe calculado: <strong>{salePreview && selectedCurrency ? `${selectedCurrency.simbolo ?? ''} ${salePreview} ${selectedCurrency.codigo}` : '—'}</strong>
        </p>
        <FormField id="sale-notes" label="Observaciones" error={fieldErrors.observaciones}>
          <textarea id="sale-notes" rows={2} maxLength={500} className={formControlClassName} value={observaciones}
            onChange={event => setObservaciones(event.target.value)} />
        </FormField>
        <p className="text-xs text-slate-500">Precio de venta real, no precio de referencia. No se calcula tipo de cambio automáticamente.</p>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button type="button" variant="secondary" disabled={saving} onClick={close}>Cancelar</Button>
          <Button type="submit" disabled={saving || !online || !availability || !selectedBalance}>{saving ? 'Guardando...' : 'Guardar venta'}</Button>
        </div>
      </form>
    </Dialog>
  </>
}
