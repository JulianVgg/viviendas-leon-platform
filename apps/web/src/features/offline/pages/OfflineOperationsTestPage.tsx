
import { useEffect, useState, type FormEvent } from 'react'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formControlClassName } from '@/components/ui/FormField'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  listPendingOperations,
  queueOfflineOperation,
  type PendingOperation,
} from '@/services/pendingOperations'

type DemoNote = {
  title: string
  observation: string
}

const DEMO_KIND = 'demo.field-note.create'

function isDemoNote(
  item: PendingOperation,
): item is PendingOperation<DemoNote> {
  if (item.kind !== DEMO_KIND) return false

  const data = item.payload

  return (
    typeof data === 'object' &&
    data !== null &&
    'title' in data &&
    typeof data.title === 'string' &&
    'observation' in data &&
    typeof data.observation === 'string'
  )
}

export default function OfflineOperationsTestPage() {
  const isOnline = useOnlineStatus()

  const [title, setTitle] = useState('')
  const [observation, setObservation] = useState('')
  const [operations, setOperations] =
    useState<PendingOperation<DemoNote>[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    listPendingOperations()
      .then((items) => {
        if (active) {
          setOperations(items.filter(isDemoNote))
        }
      })
      .catch(() => {
        if (active) {
          setError('No se pudieron cargar las operaciones.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!title.trim() || !observation.trim()) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const operation = await queueOfflineOperation<DemoNote>(
        DEMO_KIND,
        {
          title: title.trim(),
          observation: observation.trim(),
        },
      )

      setOperations((previous) => [
        ...previous,
        operation,
      ])

      setTitle('')
      setObservation('')

      setMessage(
        'Operación guardada localmente. Pendiente de sincronización.',
      )
    } catch {
      setError('No se pudo guardar la operación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageMeta
        title="Prueba OFF-03 | Viviendas León"
        description="Registro local de operaciones pendientes."
      />

      <PageHeader
        title="Prueba de registro offline"
        description="Registrar operaciones ficticias sin conexión."
      />

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={isOnline ? 'success' : 'neutral'}>
            {isOnline ? 'Con conexión' : 'Sin conexión'}
          </Badge>

          <Badge variant="warning">
            Pendientes: {operations.length}
          </Badge>
        </div>

        <p className="text-sm text-slate-500">
          Prueba técnica local. No se envía información
          al servidor. Utiliza solamente datos ficticios.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="offline-title"
              className="mb-2 block text-sm font-medium"
            >
              Título de la operación
            </label>

            <input
              id="offline-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={formControlClassName}
              placeholder="Ejemplo: Visita de prueba"
              maxLength={80}
              required
            />
          </div>

          <div>
            <label
              htmlFor="offline-observation"
              className="mb-2 block text-sm font-medium"
            >
              Observación de prueba
            </label>

            <textarea
              id="offline-observation"
              name="observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className={`${formControlClassName} min-h-28 py-2`}
              placeholder="Escribe una anotación ficticia"
              maxLength={500}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={saving || loading}
          >
            {saving ? 'Guardando...' : 'Guardar operación local'}
          </Button>
        </form>

        {message && (
          <p role="status" className="text-sm text-green-600">
            {message}
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <hr className="border-slate-200 dark:border-slate-700" />

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            Operaciones pendientes
          </h2>

          {loading ? (
            <p>Cargando operaciones...</p>
          ) : operations.length === 0 ? (
            <p className="text-sm text-slate-500">
              Todavía no existen operaciones pendientes.
            </p>
          ) : (
            <div className="space-y-3">
              {operations.map((operation) => (
                <div
                  key={operation.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{operation.payload.title}</strong>
                    <Badge variant="warning">
                      Pendiente
                    </Badge>
                  </div>

                  <p className="mt-2 text-sm">
                    {operation.payload.observation}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Fecha: {new Date(
                      operation.createdAt,
                    ).toLocaleString('es-GT')}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    ID: {operation.id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
