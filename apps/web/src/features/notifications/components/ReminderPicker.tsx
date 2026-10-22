import { OPCIONES_RECORDATORIO, type ConfigRecordatorios, type OpcionRecordatorio } from '../services/remindersService'

const field = 'min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white'
export default function ReminderPicker({ value, onChange, disabled = false, date }: {
  value: ConfigRecordatorios; onChange: (next: ConfigRecordatorios) => void; disabled?: boolean; date: string
}) {
  const isDefault = value === null
  const custom = value?.find(item => item.tipo === 'PERSONALIZADO')
  const customValue = custom?.tipo === 'PERSONALIZADO' ? custom.fechaHora : ''
  const selected = value ?? []
  const changeDay = (tipo: OpcionRecordatorio, checked: boolean) => {
    onChange(checked ? [...selected.filter(item => item.tipo !== tipo), { tipo }] : selected.filter(item => item.tipo !== tipo))
  }
  return <fieldset className="rounded-xl border border-gray-200 p-4 dark:border-gray-700" disabled={disabled}>
    <legend className="px-2 text-sm font-semibold text-gray-800 dark:text-gray-200">Recordatorios</legend>
    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
      <input type="checkbox" checked={isDefault} onChange={event => onChange(event.target.checked ? null : [])} className="size-4 accent-brand-500" />
      Utilizar las preferencias de cada participante
    </label>
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Las actividades sin hora exacta utilizan avisos por días. Se guardan para su envío en NTF-05.</p>
    {!isDefault && <div className="mt-3 space-y-2">
      {OPCIONES_RECORDATORIO.map(option => <label key={option.tipo} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
        <input type="checkbox" className="size-4 accent-brand-500" checked={selected.some(item => item.tipo === option.tipo)} onChange={event => changeDay(option.tipo, event.target.checked)} />
        {option.etiqueta}
      </label>)}
      <label className="block text-sm text-gray-700 dark:text-gray-200" htmlFor="ntf-reminder-custom">Fecha y hora personalizada (Guatemala)</label>
      <input id="ntf-reminder-custom" type="datetime-local" className={field} value={customValue} max={date ? `${date}T23:59` : undefined} onChange={event => {
        const others = selected.filter(item => item.tipo !== 'PERSONALIZADO')
        onChange(event.target.value ? [...others, { tipo: 'PERSONALIZADO', fechaHora: event.target.value }] : others)
      }} />
      <p className="text-xs text-gray-500 dark:text-gray-400">Deja todas las opciones sin seleccionar para desactivar los recordatorios de esta actividad.</p>
    </div>}
  </fieldset>
}
