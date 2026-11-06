import { useEffect, useState } from 'react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { FamilyApiError, fetchFamilyCoordinates, updateFamily, type FamilyCoordinates } from '../services/familyService'
import type { IntegralFamilyRecord } from '../types/familyIntegral'

const numeric = (value: string, min: number, max: number) => {
  if (!value.trim()) return null
  const normalized = value.trim().replace(',', '.')
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return NaN
  const number = Number(normalized)
  return Number.isFinite(number) && number >= min && number <= max ? number : NaN
}

export default function FamilyCoordinatesPanel({ family, onRefresh }: { family: IntegralFamilyRecord; onRefresh: () => Promise<IntegralFamilyRecord> }) {
  const online = useOnlineStatus()
  const [coords, setCoords] = useState<FamilyCoordinates | null>(null)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetchFamilyCoordinates(family.id, controller.signal).then((value) => {
      if (controller.signal.aborted) return
      setCoords(value)
      setLatitude(value.latitud == null ? '' : String(value.latitud))
      setLongitude(value.longitud == null ? '' : String(value.longitud))
      setError('')
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof FamilyApiError ? cause.message : 'No se pudo consultar la ubicación.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [family.id])

  async function save() {
    if (saving || !online) return
    const latitud = numeric(latitude, -90, 90)
    const longitud = numeric(longitude, -180, 180)
    if (Number.isNaN(latitud) || Number.isNaN(longitud) || (latitud === null) !== (longitud === null)) {
      setError('Ingresa ambas coordenadas válidas, o deja las dos vacías.')
      return
    }
    setSaving(true); setError(''); setNotice('')
    try {
      await updateFamily(family.id, { version: family.version, latitud, longitud })
      const next = await fetchFamilyCoordinates(family.id)
      setCoords(next)
      await onRefresh()
      setEditing(false)
      setNotice('Ubicación guardada.')
    } catch (cause) {
      setError(cause instanceof FamilyApiError && cause.status === 409
        ? 'El expediente cambió. Actualiza la página antes de guardar.'
        : cause instanceof FamilyApiError ? cause.message : 'No fue posible guardar la ubicación.')
    } finally { setSaving(false) }
  }

  return <Card>
    <CardHeader title="Ubicación geográfica" actions={!editing && coords !== null && online ? <Button type="button" size="sm" variant="secondary" onClick={() => { setEditing(true); setError(''); setNotice('') }}>Editar ubicación</Button> : undefined} />
    <CardBody>
      {loading ? <p className="text-sm text-slate-500">Consultando ubicación autorizada...</p> : null}
      {error ? <Alert variant="error" title="Ubicación">{error}</Alert> : null}
      {notice ? <Alert variant="success" title="Ubicación">{notice}</Alert> : null}
      {!loading && coords !== null && !editing ? <p className="text-sm text-slate-700 dark:text-slate-200">{coords.latitud === null ? 'Sin coordenadas registradas.' : `Latitud: ${coords.latitud} · Longitud: ${coords.longitud}`}</p> : null}
      {!loading && coords !== null && !online ? <p className="mt-2 text-sm text-slate-500">Conéctate para modificar la ubicación.</p> : null}
      {editing ? <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Latitud
          <input aria-label="Latitud de la familia" type="text" inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="14.500000" />
        </label>
        <label className="text-sm font-medium">Longitud
          <input aria-label="Longitud de la familia" type="text" inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="-90.500000" />
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="button" disabled={!online || saving} onClick={() => void save()}>{saving ? 'Guardando...' : 'Guardar ubicación'}</Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={() => { setEditing(false); setError(''); setLatitude(coords?.latitud == null ? '' : String(coords.latitud)); setLongitude(coords?.longitud == null ? '' : String(coords.longitud)) }}>Cancelar</Button>
        </div>
      </div> : null}
    </CardBody>
  </Card>
}
