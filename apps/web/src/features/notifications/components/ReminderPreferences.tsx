import { useEffect, useState } from 'react'
import { BellRing, LoaderCircle } from 'lucide-react'
import { getPreferenciasRecordatorio, OPCIONES_RECORDATORIO, setPreferenciasRecordatorio, type OpcionRecordatorio } from '../services/remindersService'

export default function ReminderPreferences({ usuarioId }: { usuarioId?: number }) {
  const [opciones, setOpciones] = useState<OpcionRecordatorio[]>(['DIA_ANTES'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true)
    void getPreferenciasRecordatorio().then(result => { if (active) setOpciones(result) })
      .catch(() => { if (active) setError('No se pudieron cargar tus preferencias.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [usuarioId])
  async function save() {
    setSaving(true); setMessage(''); setError('')
    try { await setPreferenciasRecordatorio(opciones); setMessage('Preferencias guardadas correctamente.') }
    catch { setError('No se pudieron guardar tus preferencias.') }
    finally { setSaving(false) }
  }
  return <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900" aria-label="Mis preferencias de recordatorios">
    <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-100"><BellRing size={18}/> Mis preferencias de recordatorios</h2>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Estas preferencias se conservan para actividades anteriores que las utilizaban. Las actividades nuevas se configuran directamente con tres opciones en su formulario.</p>
    {loading ? <p className="mt-3 text-sm text-gray-500">Cargando preferencias…</p> : <div className="mt-4 space-y-2">
      {OPCIONES_RECORDATORIO.map(item => <label key={item.tipo} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
        <input type="checkbox" className="size-4 accent-brand-500" checked={opciones.includes(item.tipo)} disabled={saving} onChange={event => setOpciones(current => event.target.checked ? [...current, item.tipo] : current.filter(tipo => tipo !== item.tipo))}/>
        {item.etiqueta}
      </label>)}
      <button type="button" disabled={saving} onClick={() => void save()} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-brand-600">
        {saving && <LoaderCircle size={16} className="animate-spin"/>}Guardar preferencias
      </button>
    </div>}
    {message && <p role="status" className="mt-2 text-sm text-emerald-600">{message}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </section>
}
