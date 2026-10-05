import { useState, type FormEvent } from 'react'
import Alert from '@/components/ui/Alert'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { Form, FormActions, FormGrid, FormRepeater, FormSection } from '@/components/forms'
import ComponentCard from '@/components/common/ComponentCard'

type DemoTreatment = {
  name: string
  observation: string
}

type DemoChild = {
  name: string
  type: string
  observation: string
  treatments: DemoTreatment[]
}

type DemoStatus = 'idle' | 'saving' | 'success' | 'disabled' | 'readonly'

const initialChildren: DemoChild[] = [
  {
    name: 'Elemento de muestra 1',
    type: 'Relacionado',
    observation: 'Observación inicial',
    treatments: [{ name: 'Tratamiento de muestra 1', observation: 'Aplicación de ejemplo' }],
  },
  {
    name: 'Elemento de muestra 2',
    type: 'Relacionado',
    observation: '',
    treatments: [],
  },
]

export default function FormPatternDemo() {
  const [parentName, setParentName] = useState('Registro padre de demostración')
  const [description, setDescription] = useState('Estructura local con hijos y subhijos.')
  const [parentState, setParentState] = useState('Activo')
  const [children, setChildren] = useState(initialChildren)
  const [status, setStatus] = useState<DemoStatus>('idle')
  const blocked = status === 'disabled' || status === 'readonly'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('saving')
    window.setTimeout(() => setStatus('success'), 300)
  }

  return <ComponentCard title="Demostración de estructura padre-hijo" description="Composición local para validar colecciones repetibles y anidadas.">
    <div className="mb-6 max-w-sm">
      <FormField label="Modo de demostración" id="demo-status" hint="Permite revisar estados bloqueados sin usar persistencia.">
        <select value={status === 'saving' ? 'idle' : status} onChange={(event) => setStatus(event.target.value as DemoStatus)} className={formControlClassName} disabled={status === 'saving'}>
          <option value="idle">Normal</option>
          <option value="disabled">Disabled</option>
          <option value="readonly">Readonly</option>
        </select>
      </FormField>
    </div>
    <Form mode="create" status={status} onSubmit={handleSubmit} actions={<FormActions submitting={status === 'saving'} blocked={blocked} />}>
      <FormSection title="Datos del registro padre" description="Los datos principales permanecen bajo el control del formulario padre.">
        <FormGrid>
          <FormField label="Nombre" id="demo-parent-name" required>
            <input value={parentName} onChange={(event) => setParentName(event.target.value)} className={formControlClassName} />
          </FormField>
          <FormField label="Estado" id="demo-parent-state">
            <select value={parentState} onChange={(event) => setParentState(event.target.value)} className={formControlClassName}>
              <option>Activo</option>
              <option>En revisión</option>
            </select>
          </FormField>
          <FormField label="Descripción" id="demo-parent-description" hint="Campo del registro padre.">
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className={`${formControlClassName} min-h-24 py-2`} />
          </FormField>
        </FormGrid>
      </FormSection>
      <FormRepeater
        title="Elementos hijos"
        description="Cada elemento conserva su propio estado de edición y su identificador local."
        initialItems={initialChildren}
        createItem={() => ({ name: '', type: 'Relacionado', observation: '', treatments: [] })}
        disabled={status === 'disabled' || status === 'saving'}
        readOnly={status === 'readonly'}
        itemError={(item) => item.name.trim() ? undefined : 'El nombre es obligatorio.'}
        onChange={setChildren}
        renderItem={(item, index, id, onChange, error) => <div className="space-y-4">
          <FormGrid>
            <FormField label={`Nombre del elemento ${index + 1}`} id={`${id}-name`} required error={error}>
              <input value={item.name} onChange={(event) => onChange({ ...item, name: event.target.value })} className={formControlClassName} />
            </FormField>
            <FormField label="Tipo" id={`${id}-type`}>
              <input value={item.type} onChange={(event) => onChange({ ...item, type: event.target.value })} className={formControlClassName} />
            </FormField>
            <FormField label="Observación" id={`${id}-observation`}>
              <input value={item.observation} onChange={(event) => onChange({ ...item, observation: event.target.value })} className={formControlClassName} />
            </FormField>
          </FormGrid>
          <FormRepeater
            title="Tratamientos del elemento"
            description="Colección anidada de demostración: padre, hijo y subhijo."
            initialItems={item.treatments}
            createItem={() => ({ name: '', observation: '' })}
            disabled={status === 'disabled' || status === 'saving'}
            readOnly={status === 'readonly'}
            onChange={(treatments) => onChange({ ...item, treatments })}
            renderItem={(treatment, treatmentIndex, treatmentId, updateTreatment) => <FormGrid>
              <FormField label={`Tratamiento ${treatmentIndex + 1}`} id={`${treatmentId}-name`}>
                <input value={treatment.name} onChange={(event) => updateTreatment({ ...treatment, name: event.target.value })} className={formControlClassName} />
              </FormField>
              <FormField label="Observación" id={`${treatmentId}-observation`}>
                <input value={treatment.observation} onChange={(event) => updateTreatment({ ...treatment, observation: event.target.value })} className={formControlClassName} />
              </FormField>
            </FormGrid>}
          />
        </div>}
      />
      {status === 'success' && <Alert variant="success" title="Demostración guardada">Los datos permanecen únicamente en el estado local.</Alert>}
      <output className="sr-only" aria-live="polite">{children.length} elementos hijos</output>
    </Form>
  </ComponentCard>
}
