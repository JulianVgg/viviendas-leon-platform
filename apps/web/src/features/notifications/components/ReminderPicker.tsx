import { OPCIONES_RECORDATORIO, type ConfigRecordatorios, type OpcionRecordatorio } from '../services/remindersService'

export default function ReminderPicker({ value, onChange, disabled = false }: {
  value: ConfigRecordatorios; onChange: (next: ConfigRecordatorios) => void; disabled?: boolean; date: string
}) {
  // Valores null procedentes de eventos antiguos se muestran con el valor base.
  // Los eventos nuevos guardan siempre su selección explícita en PostgreSQL.
  const selected = value ?? [{ tipo: 'DIA_ANTES' as const }]
  const changeDay = (tipo: OpcionRecordatorio, checked: boolean) => {
    onChange(checked ? [...selected.filter(item => item.tipo !== tipo), { tipo }]
      : selected.filter(item => item.tipo !== tipo))
  }
  return <fieldset className="rounded-xl border border-gray-200 p-4 dark:border-gray-700" disabled={disabled}>
    <legend className="px-2 text-sm font-semibold text-gray-800 dark:text-gray-200">Recordatorios</legend>
    <div className="space-y-2">
      {OPCIONES_RECORDATORIO.map(option => <label key={option.tipo} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
        <input type="checkbox" className="size-4 accent-brand-500" checked={selected.some(item => item.tipo === option.tipo)} onChange={event => changeDay(option.tipo, event.target.checked)} />
        {option.etiqueta}
      </label>)}
    </div>
    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Los avisos se generan a las 8:00 a. m. (Guatemala). Desmarca las tres opciones para desactivar los recordatorios.</p>
  </fieldset>
}
