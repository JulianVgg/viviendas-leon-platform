import { Link } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import ComponentCard from '@/components/common/ComponentCard'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'
import MiAgendaDashboard from '@/features/dashboard/pages/MiAgendaDashboard'

const enlacePrimario = 'layout-focus inline-flex min-h-11 items-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 motion-reduce:transition-none'
const enlaceSecundario = 'layout-focus inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'

export default function DashboardPage() {
  const { usuario } = useAuth()
  const familias = !!usuario && canViewPath(usuario, '/familias')
  const visitas = !!usuario && canViewPath(usuario, '/visitas/agenda')
  return <>
    <PageMeta title="Mi agenda | Viviendas León" description="Resumen personal de actividades y compromisos" />
    <PageHeader title="Panel principal" description="Consulta tus actividades asignadas y compromisos pendientes en un solo lugar." />
    <MiAgendaDashboard />
    {(familias || visitas) && <section className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Accesos rápidos</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {familias && <ComponentCard title="Familias y beneficiarios" description="Consulta expedientes o registra una nueva familia.">
          <div className="flex flex-wrap gap-3">
            <Link to="/familias" className={enlacePrimario}>Ver familias</Link>
            {usuario && canViewPath(usuario, '/familias/nueva') && <Link to="/familias/nueva" className={enlaceSecundario}>Registrar familia</Link>}
          </div>
        </ComponentCard>}
        {visitas && <ComponentCard title="Visitas técnicas" description="Consulta la agenda o registra una visita de campo.">
          <div className="flex flex-wrap gap-3">
            <Link to="/visitas/agenda" className={enlacePrimario}>Ver agenda</Link>
            {usuario && canViewPath(usuario, '/visitas/nueva') && <Link to="/visitas/nueva" className={enlaceSecundario}>Registrar visita</Link>}
          </div>
        </ComponentCard>}
      </div>
    </section>}
  </>
}
