import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import ComponentCard from '@/components/common/ComponentCard'
import FormPatternDemo from '@/components/forms/FormPatternDemo'

const indicators = ['Familias atendidas', 'Huertos activos', 'Visitas programadas', 'Alertas pendientes']

export default function DashboardPage() {
  return <><PageMeta title="Dashboard | Viviendas León Guatemala" description="Resumen general de Viviendas León Guatemala." /><PageHeader title="Dashboard" description="Vista general para dar seguimiento a los programas de Viviendas León Guatemala." /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{indicators.map((item) => <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-400">{item}</p><p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">—</p><p className="mt-2 text-xs text-slate-500">Vista preparada</p></div>)}</div><div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2"><ComponentCard title="Actividad reciente" description="Espacio reservado para próximos registros y seguimientos."><p className="py-12 text-center text-sm text-slate-500">Aún no hay actividad disponible.</p></ComponentCard><ComponentCard title="Resumen de programas" description="Aquí se visualizarán avances por programa y comunidad."><p className="py-12 text-center text-sm text-slate-500">Indicadores en preparación.</p></ComponentCard></div><div className="mt-6"><FormPatternDemo /></div></>
}
