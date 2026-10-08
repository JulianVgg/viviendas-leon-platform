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
import { formControlClassName } from '@/components/ui/FormField'
import LoadingState from '@/components/ui/LoadingState'
import { fetchFamilies } from '@/features/families/services/familyService'
import type { FamilyListResponse } from '@/features/families/types/family'

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

export default function FamilyListPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<FamilyListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadFamilies() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetchFamilies(
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
      } catch (cause) {
        if (controller.signal.aborted) return
        setResult(null)
        setError(cause instanceof Error ? cause.message : 'Ocurrió un error al consultar las familias.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadFamilies()
    return () => controller.abort()
  }, [page, search, status, requestVersion])

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
      className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {family.nombreReferencia}
    </Link>,
    family.comunidad.nombre,
    family.programas.length > 0 ? family.programas.map((program) => program.nombre).join(', ') : 'Sin programa',
    <span key={`members-${family.id}`}>{family.integrantes}</span>,
    formatDate(family.fechaIngreso),
    <Badge key={`status-${family.id}`} variant={statusBadgeVariant(family.estado)}>
      {humanizeStatus(family.estado)}
    </Badge>,
  ]) ?? []

  return (
    <>
      <PageMeta
        title="Familias y beneficiarios | Viviendas León Guatemala"
        description="Consulta de familias beneficiarias registradas en la plataforma."
      />
      <PageHeader
        title="Familias y beneficiarios"
        description="Consulta las familias registradas y localízalas por nombre, integrante, comunidad o programa."
      />

      <ComponentCard
        title="Listado de familias"
        description="La información principal se obtiene desde la base de datos institucional."
      >
        <form className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]" onSubmit={handleSearch}>
          <div>
            <label htmlFor="family-search" className="sr-only">Buscar familia</label>
            <input
              id="family-search"
              type="search"
              className={formControlClassName}
              placeholder="Buscar por familia, integrante, comunidad o programa"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="family-status" className="sr-only">Filtrar por estado</label>
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
          </div>

          <div className="flex gap-2">
            <Button type="submit">Buscar</Button>
            {(search || status) && (
              <Button type="button" variant="secondary" onClick={clearFilters}>Limpiar</Button>
            )}
          </div>
        </form>

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
              columns={['Familia', 'Comunidad', 'Programas', 'Integrantes', 'Fecha de ingreso', 'Estado']}
              rows={rows}
            />}

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>
                {result.pagination.total} {result.pagination.total === 1 ? 'familia encontrada' : 'familias encontradas'}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </Button>
                <span>Página {result.pagination.page} de {result.pagination.totalPages}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page >= result.pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </ComponentCard>
    </>
  )
}
