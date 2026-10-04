import PageHeader from './PageHeader'
import PageMeta from './PageMeta'
import ComponentCard from './ComponentCard'
import DataTableContainer from './DataTableContainer'
import EmptyState from './EmptyState'

export default function ModulePage({ title, description, columns, tableTitle = 'Contenido del módulo', rows = [] }: { title: string; description: string; columns: string[]; tableTitle?: string; rows?: React.ReactNode[][] }) {
  return <>
    <PageMeta title={`${title} | Viviendas León Guatemala`} description={description} />
    <PageHeader title={title} description={description} />
    <ComponentCard title={tableTitle} description="La estructura está preparada para integrar información en una fase posterior.">
      {rows.length ? <DataTableContainer columns={columns} rows={rows} /> : <EmptyState title="Módulo preparado" description="Aún no hay registros funcionales disponibles." />}
    </ComponentCard>
  </>
}
