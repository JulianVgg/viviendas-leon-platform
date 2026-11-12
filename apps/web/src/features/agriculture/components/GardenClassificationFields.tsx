import FormField, { formControlClassName } from '@/components/ui/FormField'
import type { GardenClassification } from '../services/gardens'

export const entornoLabels: Record<NonNullable<GardenClassification['entornoCultivo']>, string> = {
  CAMPO_ABIERTO: 'Campo abierto', MACROTUNEL: 'Macrotúnel', MIXTO: 'Mixto', OTRO: 'Otro',
}
export const modalidadLabels: Record<GardenClassification['modalidadesProductivas'][number], string> = {
  AGRICOLA: 'Agrícola', AGROFORESTAL: 'Agroforestal', SILVOPASTORIL: 'Silvopastoril',
}
export const modalidadOptions = Object.keys(modalidadLabels) as GardenClassification['modalidadesProductivas']

export function GardenClassificationFields({ value, onChange, disabled = false }: {
  value: GardenClassification
  onChange: (next: GardenClassification) => void
  disabled?: boolean
}) {
  return <>
    <FormField label="Clasificación del huerto">
      <select className={formControlClassName} value={value.tipo ?? ''} disabled={disabled}
        onChange={event => onChange({ ...value, tipo: (event.target.value || null) as GardenClassification['tipo'] })}>
        <option value="">Sin clasificar</option>
        <option value="FAMILIAR">Familiar</option>
        <option value="COMUNITARIO">Comunitario</option>
      </select>
    </FormField>
    <FormField label="Tipo de huerto">
      <select className={formControlClassName} value={value.entornoCultivo ?? ''} disabled={disabled}
        onChange={event => {
          const entornoCultivo = (event.target.value || null) as GardenClassification['entornoCultivo']
          onChange({ ...value, entornoCultivo, detalleEntorno: entornoCultivo === 'OTRO' ? value.detalleEntorno : null })
        }}>
        <option value="">Sin clasificar</option>
        {Object.entries(entornoLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </FormField>
    {value.entornoCultivo === 'OTRO' && <div className="sm:col-span-2">
      <FormField label="Descripción del entorno" required>
        <input className={formControlClassName} maxLength={180} required disabled={disabled}
          value={value.detalleEntorno ?? ''} onChange={event => onChange({ ...value, detalleEntorno: event.target.value })}
          placeholder="Indica la estructura utilizada" />
      </FormField>
    </div>}
    <fieldset className="sm:col-span-2 space-y-2 rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800">
      <legend className="px-1 text-sm font-medium text-gray-700 dark:text-gray-200">Modalidades productivas</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {modalidadOptions.map(modalidad => <label key={modalidad} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input type="checkbox" className="size-4 accent-brand-600" disabled={disabled} checked={value.modalidadesProductivas.includes(modalidad)}
            onChange={event => onChange({ ...value, modalidadesProductivas: event.target.checked
              ? [...value.modalidadesProductivas, modalidad]
              : value.modalidadesProductivas.filter(item => item !== modalidad),
            })} />
          {modalidadLabels[modalidad]}
        </label>)}
      </div>
    </fieldset>
  </>
}
