import PageMeta from '@/components/common/PageMeta'
import MiAgendaDashboard from './MiAgendaDashboard'

export default function MiAgendaPage() {
  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
    <PageMeta title="Mi agenda | Viviendas León" description="Actividades y compromisos personales" />
    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Mi agenda</h1>
    <MiAgendaDashboard />
  </main>
}
