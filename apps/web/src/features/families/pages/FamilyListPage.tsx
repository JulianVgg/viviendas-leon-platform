import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import ComponentCard from '@/components/common/ComponentCard'
import DataTableContainer from '@/components/common/DataTableContainer'
import EmptyState from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import LoadingState from '@/components/ui/LoadingState'
import { fetchFamiliesWithOffline } from '@/features/families/services/familyOfflineService'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import type { FamilyListResponse } from '@/features/families/types/family'
import { useAuth } from '@/features/auth/AuthProvider'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVA', label: 'Activa' },
  { value: 'RETIRADA', label: 'Retirada' },
  { value: 'EGRESADA', label: 'Egresada' },
]

function statusBadgeVariant(status: string): 'neutral' | 'success' | 'warning' {
  if (status.toUpperCase() === 'ACTIVA') return 'success'
  if (status.toUpperCase() === 'RETIRADA') return 'warning'
  return 'neutral'
}

function humanizeStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export default function FamilyListPage({ mode = 'list' }: { mode?: 'list' | 'edit' }) {
  const { usuario } = useAuth()
  const canEdit = Boolean(usuario?.permisos.includes('FAMILIAS_WRITE'))
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<FamilyListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [dataOrigin, setDataOrigin] = useState<'remote' | 'cache' | null>(null)
  const isOnline = useOnlineStatus()

  useEffect(() => {
    const controller = new AbortController()

    async function loadFamilies() {
      setLoading(true)
      setError(null)

      try {
        const { data: response, source, savedAt } = await fetchFamiliesWithOffline(
          {
            search: search || undefined,
            estado: status || undefined,
            page,
            limit: PAGE_SIZE,
          },
          controller.signal,
        )
        if (controller.signal.aborted) return

        if (page > response.pagination.totalPages) {
          setPage(Math.max(1, response.pagination.totalPages))
          return
        }

        setResult(response)
        setDataOrigin(source)
        setCachedAt(savedAt)
      } catch (cause) {
        if (controller.signal.aborted) return
        setResult(null)
        setDataOrigin(null)
        setCachedAt(null)
        setError(cause instanceof Error ? cause.message : 'Ocurrió un error al consultar las familias.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadFamilies()
    return () => controller.abort()
  }, [page, search, status, requestVersion, isOnline])

  function retryQuery() {
    setRequestVersion((current) => current + 1)
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
    retryQuery()
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setStatus('')
    setPage(1)
    retryQuery()
  }

  const rows = result?.data.map((family) => [
    <Link
      key={family.id}
      to={`/familias/${family.id}`}
      className="layout-focus inline-flex min-w-48 max-w-80 flex-col gap-1 rounded-md whitespace-normal text-brand-600 transition-colors hover:text-brand-700 motion-reduce:transition-none dark:text-brand-300 dark:hover:text-brand-100"
    >
      <span className="font-semibold leading-5">{family.nombreReferencia}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">Expediente #{family.id}</span>
    </Link>,
    <span key={`community-${family.id}`} className="block min-w-32 max-w-56 whitespace-normal leading-5">{family.comunidad.nombre}</span>,
    <span key={`programs-${family.id}`} className="block min-w-32 max-w-64 whitespace-normal leading-5">{family.programas.length > 0 ? family.programas.map((program) => program.nombre).join(', ') : 'Sin programa'}</span>,
    <span key={`members-${family.id}`} className="font-medium tabular-nums">{family.integrantes}</span>,
    formatDate(family.fechaIngreso),
    <Badge key={`status-${family.id}`} variant={statusBadgeVariant(family.estado)}>
      {humanizeStatus(family.estado)}
    </Badge>,
    ...(mode === 'edit' ? [canEdit ? <Link key={`edit-${family.id}`} to={`/familias/${family.id}/editar`} className="layout-focus inline-flex min-h-9 items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Editar</Link> : <span key={`edit-${family.id}`} className="text-xs text-gray-500">Sin permiso</span>] : []),
  ]) ?? []

  return (
    <>
      <PageMeta
        title={`${mode === 'edit' ? 'Seleccionar familia' : 'Familias y beneficiarios'} | Viviendas León Guatemala`}
        description={mode === 'edit' ? 'Selección de un expediente familiar existente.' : 'Consulta de familias beneficiarias registradas en la plataforma.'}
      />
      <PageHeader
        title={mode === 'edit' ? 'Seleccionar familia' : 'Familias y beneficiarios'}
        description={mode === 'edit' ? 'Busca una familia y abre su formulario de edición autorizado.' : 'Consulta las familias registradas y localízalas por nombre, integrante, comunidad o programa.'}
        actions={mode === 'list' ? <Link to="/familias/nueva" className="layout-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-theme-sm active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"><span aria-hidden="true" className="text-lg leading-none">+</span>Registrar familia</Link> : <Link to="/familias" className="layout-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Volver al listado</Link>}
      />

      <ComponentCard
        title={mode === 'edit' ? 'Familias disponibles' : 'Listado de familias'}
         description={mode === 'edit' ? 'Usa la acción Editar para actualizar la información general de una familia.' : 'Consulta los registros y abre un expediente para ver su información.'}
        actions={!loading && !error && result ? <Badge>{result.pagination.total} {result.pagination.total === 1 ? 'familia' : 'familias'}</Badge> : undefined}
      >
        {dataOrigin === 'cache' && (
          <Alert variant="warning" title="Consulta sin conexión: copia local" className="mb-5">
            Se muestra una copia guardada {cachedAt ? new Date(cachedAt).toLocaleString('es-GT') : 'anteriormente'}.
            Puede estar desactualizada y es solo de lectura.
          </Alert>
        )}
        <form role="search" aria-label="Buscar familias" aria-controls="family-results" className="mb-6 grid items-end gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_12rem] 2xl:grid-cols-[minmax(0,1fr)_12rem_auto] dark:border-slate-800 dark:bg-white/5" onSubmit={handleSearch}>
          <FormField label="Buscar familia" id="family-search">
            <input
              id="family-search"
              type="search"
              className={formControlClassName}
              placeholder="Buscar por familia, integrante, comunidad o programa"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              maxLength={100}
            />
          </FormField>

          <FormField label="Estado" id="family-status">
            <select
              id="family-status"
              className={formControlClassName}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FormField>

          <div className="flex flex-wrap gap-2 md:col-span-2 2xl:col-span-1">
            <Button type="submit" className="flex-1 sm:flex-none">Buscar</Button>
            {(search || status) && (
              <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={clearFilters}>Limpiar</Button>
            )}
          </div>
        </form>

        <div id="family-results" aria-busy={loading} className="space-y-5">
        {error && (
          <Alert variant="error" title="No se pudo cargar el listado">
            <p>{error}</p>
            <Button type="button" variant="secondary" className="mt-3" onClick={retryQuery}>
              Reintentar
            </Button>
          </Alert>
        )}

        {loading && <LoadingState label="Consultando familias registradas..." />}

        {!loading && !error && result && result.data.length === 0 && (
          <EmptyState
            title={result.pagination.total > 0 ? 'Esta página ya no tiene familias' : search || status ? 'No se encontraron familias' : 'No hay familias registradas'}
            description={result.pagination.total > 0
              ? 'El listado cambió. Vuelve a la primera página para consultar las familias disponibles.'
              : search || status
              ? 'Prueba con otro término de búsqueda o limpia los filtros aplicados.'
              : 'Cuando se registren familias aparecerán en este listado.'}
            action={result.pagination.total > 0
              ? <Button type="button" variant="secondary" onClick={() => { setPage(1); retryQuery() }}>Volver a la primera página</Button>
              : (search || status) ? <Button type="button" variant="secondary" onClick={clearFilters}>Limpiar filtros</Button> : undefined}
          />
        )}

        {!loading && !error && result && result.pagination.total > 0 && (
          <>
            {result.data.length > 0 && <DataTableContainer
               columns={['Familia', 'Comunidad', 'Programas', 'Integrantes', 'Fecha de ingreso', 'Estado', ...(mode === 'edit' ? ['Acción'] : [])]}
              rows={rows}
              caption="Familias y beneficiarios registrados"
            />}

            <div className="mt-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-white/5 dark:text-slate-400 lg:flex-row lg:items-center lg:justify-between">
              <p role="status" className="font-medium tabular-nums">
                {result.pagination.total} {result.pagination.total === 1 ? 'familia encontrada' : 'familias encontradas'}
              </p>
              <nav aria-label="Paginación de familias" className="grid grid-cols-2 items-center gap-2 sm:flex">
                <span className="col-span-2 py-1 text-center text-xs font-medium tabular-nums sm:me-2">Página {result.pagination.page} de {result.pagination.totalPages}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page >= result.pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                </Button>
              </nav>
            </div>
          </>
        )}
        </div>
      </ComponentCard>
    </>
  )
}
