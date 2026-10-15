import { Link } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import ComponentCard from '@/components/common/ComponentCard'
import EmptyState from '@/components/common/EmptyState'

export default function VisitHistoryPage() {
  return <>
    <PageMeta title="Historial de visitas | Viviendas León" description="Consulta histórica de asistencia técnica." />
    <PageHeader title="Historial de visitas" description="Aquí consultaremos visitas finalizadas, sus evaluaciones, compromisos y evidencias cuando esté lista la API." actions={<Link to="/visitas/nueva" className="inline-flex min-h-11 items-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">+ Registrar visita</Link>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      {['Visitas realizadas', 'Seguimientos pendientes', 'Con evidencias'].map(title => <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-theme-xs dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-400">{title}</p><p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">—</p><p className="mt-2 text-xs text-slate-500">Sin fuente de datos conectada</p></div>)}
    </div>
    <ComponentCard title="Registro histórico" description="Pendiente de conectar a endpoints autorizados de visitas. Evitamos presentar registros inventados.">
      <EmptyState title="Todavía no hay historial consultable" description="En la siguiente etapa implementaremos filtros por familia, comunidad, técnico, fecha y estado, además del expediente de cada visita." action={<Link to="/visitas/agenda" className="text-sm font-medium text-brand-600 hover:underline">Ir a la agenda →</Link>} />
    </ComponentCard>
  </>
}
