import { useEffect, useMemo, useState } from 'react'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { getOfflineData, saveOfflineData } from '@/db/offlineDb'
import { listProductionUnits, listProductions, type Production, type ProductionUnit } from '@/features/agriculture/services/productionService'
import { listSaleCurrencies, saleAvailability, type SaleAvailability, type SaleCurrency } from '@/features/agriculture/services/salesService'
import type { MovimientoVisita, MovimientoMode } from '../services/visitEconomics'
import { validarMovimientoParaVisita } from '../services/visitEconomics'

const input = `${formControlClassName} w-full`
const day = (date: string) => date || ''
type Props = { cycleId: number; date: string; userId: number; value?: MovimientoVisita; hideModeSelector?: boolean;
  onChange: (value: MovimientoVisita | undefined) => void }

export default function VisitEconomicsFields({ cycleId, date, userId, value, onChange, hideModeSelector = false }: Props) {
  const mode: MovimientoMode = !value ? 'ninguno' : value.cosecha ? 'nueva' : 'existente'
  const [units, setUnits] = useState<ProductionUnit[]>([])
  const [currencies, setCurrencies] = useState<SaleCurrency[]>([])
  const [harvests, setHarvests] = useState<Production[]>([])
  const [balance, setBalance] = useState<SaleAvailability | null>(null)
  const [warning, setWarning] = useState('')
  const [hasRemoteHarvest, setHasRemoteHarvest] = useState(false)
  const saleRequested = Boolean(value?.venta)
  const selectedHarvest = harvests.find(row => row.id === value?.venta?.registroProduccionId)
  const selectedUnit = units.find(row => row.id === value?.cosecha?.unidadMedidaId)
  const saleUnits = mode === 'nueva'
    ? units.filter(row => row.id === value?.cosecha?.unidadMedidaId)
    : (balance?.unidades.filter(row => Number(row.disponible) > 0).map(row => ({ ...row.unidadMedida, tipo: row.tipo })) ?? [])
  const available = balance?.unidades.find(row => row.unidadMedida.id === value?.venta?.unidadMedidaId)
  const selectedCurrency = currencies.find(row => row.id === value?.venta?.monedaId)
  const total = useMemo(() => {
    if (!value?.venta) return null
    const sum = Number(value.venta.cantidad) * Number(value.venta.precioUnitario)
    return Number.isFinite(sum) && sum > 0 ? sum.toFixed(2) : null
  }, [value?.venta])

  useEffect(() => {
    let active = true
    const key = `visits:economy-catalog:v1:user:${userId}`
    Promise.all([listProductionUnits(), listSaleCurrencies()]).then(async ([u, c]) => {
      if (!active) return
      setUnits(u); setCurrencies(c); setWarning('')
      await saveOfflineData(key, { u, c }).catch(() => {})
    }).catch(async () => {
      const cached = await getOfflineData<{u: ProductionUnit[]; c: SaleCurrency[]}>(key).catch(() => undefined)
      if (!active) return
      setUnits(cached?.data.u ?? []); setCurrencies(cached?.data.c ?? [])
      setWarning(cached ? 'Catálogos guardados en este dispositivo. Los movimientos se validarán al sincronizar.' :
        'Sin catálogos disponibles. Conéctate para registrar cosechas o ventas reales.')
    })
    return () => { active = false }
  }, [userId])
  useEffect(() => {
    let active = true
    setHasRemoteHarvest(false); setHarvests([])
    listProductions(cycleId).then(result => {
      if (active) { setHarvests(result); setHasRemoteHarvest(true) }
    }).catch(() => { if (active) setHasRemoteHarvest(false) })
    return () => { active = false }
  }, [cycleId])
  useEffect(() => {
    let active = true
    setBalance(null)
    if (mode !== 'existente' || !value?.venta?.registroProduccionId) return () => { active = false }
    saleAvailability(value.venta.registroProduccionId).then(result => { if (active) setBalance(result) }).catch(() => {})
    return () => { active = false }
  }, [mode, value?.venta?.registroProduccionId])

  const start = (next: MovimientoMode) => {
    if (next === 'ninguno') { onChange(undefined); return }
    if (next === 'nueva') {
      onChange({ cosecha: { fechaCosecha: day(date), cantidad: '', unidadMedidaId: 0 } })
    } else {
      onChange({ venta: { registroProduccionId: 0, fechaVenta: day(date), cantidad: '', unidadMedidaId: 0,
        monedaId: 0, precioUnitario: '', observaciones: null } })
    }
  }
  const updateHarvest = (patch: Partial<NonNullable<MovimientoVisita['cosecha']>>) => {
    if (!value?.cosecha) return
    const cosecha = { ...value.cosecha, ...patch }
    onChange({ ...value, cosecha, ...(value.venta ? { venta: { ...value.venta, unidadMedidaId: cosecha.unidadMedidaId } } : {}) })
  }
  const updateSale = (patch: Partial<NonNullable<MovimientoVisita['venta']>>) => {
    if (!value) return
    const defaultSale = { fechaVenta: date, cantidad: '', unidadMedidaId: value.cosecha?.unidadMedidaId ?? 0,
      monedaId: 0, precioUnitario: '', observaciones: null }
    onChange({ ...value, venta: { ...defaultSale, ...value.venta, ...patch } })
  }
  return <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
    <div className="space-y-3">
      {!hideModeSelector && <h5 className="text-sm font-medium text-slate-900 dark:text-white">¿Hubo cosecha o venta real?</h5>}
      {warning && <p role="status" className="text-xs text-amber-700">{warning}</p>}
      {!hideModeSelector && <FormField id={`movement-mode-${cycleId}`} label="Registro confirmado">
        <select id={`movement-mode-${cycleId}`} className={input} value={mode}
          onChange={event => start(event.target.value as MovimientoMode)}>
          <option value="ninguno">No</option>
          <option value="nueva" disabled={!units.length}>Sí, hubo cosecha</option>
          <option value="existente" disabled={!hasRemoteHarvest || !harvests.length || !currencies.length}>Sí, venta de cosecha anterior</option>
        </select>
      </FormField>}
      {mode === 'nueva' && value?.cosecha && <div className="grid gap-3 sm:grid-cols-3">
        <FormField id={`harvest-date-${cycleId}`} label="Fecha de cosecha">
          <input id={`harvest-date-${cycleId}`} className={input} type="date" max={date} value={value.cosecha.fechaCosecha}
            onChange={e => updateHarvest({ fechaCosecha: e.target.value })}/>
        </FormField>
        <FormField id={`harvest-unit-${cycleId}`} label="Unidad cosechada">
          <select id={`harvest-unit-${cycleId}`} className={input} value={value.cosecha.unidadMedidaId || ''}
            onChange={e => updateHarvest({ unidadMedidaId: Number(e.target.value) })}>
            <option value="">Seleccionar</option>
            {units.map(unit => <option key={unit.id} value={unit.id}>{unit.nombre}</option>)}
          </select>
        </FormField>
        <FormField id={`harvest-qty-${cycleId}`} label="Cantidad cosechada">
          <input id={`harvest-qty-${cycleId}`} className={input} type="number" min={selectedUnit?.tipo === 'kg' ? '0.001' : '1'}
            step={selectedUnit?.tipo === 'kg' ? '0.001' : '1'} value={value.cosecha.cantidad}
            onChange={e => updateHarvest({ cantidad: e.target.value })}/>
        </FormField>
      </div>}
      {mode === 'nueva' && <FormField id={`harvest-sale-${cycleId}`} label="¿Se realizó una venta de esta cosecha?">
        <select id={`harvest-sale-${cycleId}`} className={input} value={saleRequested ? 'si' : 'no'} disabled={!currencies.length}
          onChange={e => { if (e.target.value === 'si') updateSale({}); else if (value?.cosecha) onChange({ cosecha: value.cosecha }) }}>
          <option value="no">No</option><option value="si">Sí</option>
        </select>
      </FormField>}
      {mode === 'existente' && value?.venta && <FormField id={`existing-harvest-${cycleId}`} label="Cosecha existente">
        <select id={`existing-harvest-${cycleId}`} className={input} value={value.venta.registroProduccionId || ''}
          onChange={e => updateSale({ registroProduccionId: Number(e.target.value), unidadMedidaId: 0 })}>
          <option value="">Seleccionar cosecha</option>
          {harvests.map(item => <option value={item.id} key={item.id}>#{item.id} · {item.fechaFinPeriodo}</option>)}
        </select>
      </FormField>}
      {value?.venta && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <FormField id={`sale-date-${cycleId}`} label="Fecha de venta">
          <input id={`sale-date-${cycleId}`} className={input} type="date" max={date}
            min={value.cosecha?.fechaCosecha ?? selectedHarvest?.fechaInicioPeriodo} value={value.venta.fechaVenta}
            onChange={e => updateSale({ fechaVenta: e.target.value })}/>
        </FormField>
        <FormField id={`sale-unit-${cycleId}`} label="Unidad vendida">
          <select id={`sale-unit-${cycleId}`} className={input} value={value.venta.unidadMedidaId || ''}
            onChange={e => updateSale({ unidadMedidaId: Number(e.target.value) })}>
            <option value="">Seleccionar</option>
            {saleUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.nombre}</option>)}
          </select>
        </FormField>
        <FormField id={`sale-qty-${cycleId}`} label="Cantidad vendida">
          <input id={`sale-qty-${cycleId}`} className={input} type="number" min="0.001" step="any"
            max={value.cosecha?.cantidad ?? available?.disponible} value={value.venta.cantidad}
            onChange={e => updateSale({ cantidad: e.target.value })}/>
        </FormField>
        <FormField id={`sale-currency-${cycleId}`} label="Moneda">
          <select id={`sale-currency-${cycleId}`} className={input} value={value.venta.monedaId || ''}
            onChange={e => updateSale({ monedaId: Number(e.target.value) })}>
            <option value="">Seleccionar</option>
            {currencies.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
          </select>
        </FormField>
        <FormField id={`sale-price-${cycleId}`} label="Precio real por unidad">
          <input id={`sale-price-${cycleId}`} className={input} type="number" min="0.0001" step="any" value={value.venta.precioUnitario}
            onChange={e => updateSale({ precioUnitario: e.target.value })}/>
        </FormField>
        <div className="self-end rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">Total de venta: <strong>{total === null ? '—' : `${selectedCurrency?.codigo ?? ''} ${total}`}</strong></div>
        <div className="sm:col-span-2 xl:col-span-3">
          <FormField id={`sale-note-${cycleId}`} label="Observaciones de venta">
            <textarea id={`sale-note-${cycleId}`} className={input} maxLength={500} rows={2}
              value={value.venta.observaciones ?? ''} onChange={e => updateSale({ observaciones: e.target.value || null })}/>
          </FormField>
        </div>
      </div>}
      {value?.venta && mode === 'existente' && !balance && <p className="text-xs text-amber-700">Sin saldo confirmado. Se comprobará al sincronizar; una venta sin disponibilidad será rechazada.</p>}
      {value && validarMovimientoParaVisita(value, date) && <p role="alert" className="text-xs text-amber-700">{validarMovimientoParaVisita(value,date)}</p>}
      {value && <p className="text-xs text-slate-500">Si no hay conexión, la visita y este registro quedarán pendientes; no serán ventas confirmadas hasta sincronizar.</p>}
    </div>
  </div>
}
