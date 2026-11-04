import { useEffect, useState } from 'react'
import { BellRing, Clock3, LoaderCircle } from 'lucide-react'
import {
  consultarPreferenciasEnvioPush, guardarPreferenciasEnvioPush,
  type PreferenciasEnvioPush,
} from '../services/pushService'

const PREDETERMINADAS: PreferenciasEnvioPush = {
  habilitadas: true, silencioInicio: null, silencioFin: null,
}

/** Preferencias privadas por usuario; los horarios son hora de Guatemala (UTC-06:00). */
export default function PushDeliveryPreferences({ usuarioId }: { usuarioId?: number }) {
  const [preferencias, setPreferencias] = useState<PreferenciasEnvioPush>(PREDETERMINADAS)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const silencioActivo = preferencias.silencioInicio !== null && preferencias.silencioFin !== null

  useEffect(() => {
    let activo = true
    setCargando(true)
    setError('')
    setMensaje('')
    setPreferencias(PREDETERMINADAS)
    if (!usuarioId) { setCargando(false); return () => { activo = false } }
    void consultarPreferenciasEnvioPush()
      .then(valor => { if (activo) setPreferencias(valor) })
      .catch(() => { if (activo) setError('No se pudieron consultar tus preferencias push.') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [usuarioId])

  async function guardar() {
    setGuardando(true)
    setMensaje('')
    setError('')
    try {
      const guardadas = await guardarPreferenciasEnvioPush(preferencias)
      setPreferencias(guardadas)
      setMensaje('Preferencias de notificaciones automáticas guardadas.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar las preferencias.')
    } finally { setGuardando(false) }
  }

  return <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900" aria-label="Preferencias de envío automático push">
    <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-100">
      <BellRing size={18} /> Avisos automáticos push
    </h2>
    {cargando ? <p className="mt-3 flex items-center gap-2 text-sm text-gray-500"><LoaderCircle size={16} className="animate-spin" /> Cargando preferencias…</p>
      : <div className="mt-4 space-y-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input type="checkbox" className="size-4 accent-brand-500" disabled={guardando || !usuarioId}
            checked={preferencias.habilitadas}
            onChange={e => setPreferencias(actual => ({ ...actual, habilitadas: e.target.checked }))} />
          Recibir notificaciones push automáticas
        </label>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input type="checkbox" className="size-4 accent-brand-500" disabled={guardando || !usuarioId}
              checked={silencioActivo}
              onChange={e => setPreferencias(actual => ({ ...actual,
                silencioInicio: e.target.checked ? '22:00' : null,
                silencioFin: e.target.checked ? '07:00' : null,
              }))} />
            <Clock3 size={16} /> Activar horario de silencio
          </label>
          {silencioActivo && <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">Desde (Guatemala)
              <input type="time" value={preferencias.silencioInicio ?? ''} disabled={guardando}
                onChange={e => setPreferencias(actual => ({ ...actual, silencioInicio: e.target.value }))}
                className="rounded-lg border border-gray-300 bg-transparent p-2 dark:border-gray-700" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">Hasta (Guatemala)
              <input type="time" value={preferencias.silencioFin ?? ''} disabled={guardando}
                onChange={e => setPreferencias(actual => ({ ...actual, silencioFin: e.target.value }))}
                className="rounded-lg border border-gray-300 bg-transparent p-2 dark:border-gray-700" />
            </label>
          </div>}
        </div>
        <button type="button" disabled={guardando || !usuarioId ||
          (silencioActivo && (!preferencias.silencioInicio || !preferencias.silencioFin ||
            preferencias.silencioInicio === preferencias.silencioFin))}
          onClick={() => void guardar()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
          {guardando && <LoaderCircle size={16} className="animate-spin" />} Guardar preferencias push
        </button>
      </div>}
    {mensaje && <p role="status" className="mt-3 text-sm text-emerald-600">{mensaje}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  </section>
}
