import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import ComponentCard from '@/components/common/ComponentCard'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/common/EmptyState'

function localIso(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function VisitAgendaPage() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const today = localIso(new Date())
  const dates = useMemo(() => {
    const offset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [...Array<null>(offset).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)]
  }, [month])
  const moveMonth = (months: number) => setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + months, 1))

  return <>
    <PageMeta title="Agenda de visitas | Viviendas León" description="Planificación de asistencia técnica a familias." />
    <PageHeader title="Agenda de visitas" description="Selecciona una fecha para preparar el registro de una visita técnica. La agenda aún no obtiene citas del servidor." actions={<Link className="inline-flex min-h-11 items-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600" to="/visitas/nueva">+ Registrar visita</Link>} />
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-200" role="status">Vista inicial: la programación y asignación de visitas se conectarán con la API en la siguiente etapa. No se muestran citas ficticias.</div>
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <ComponentCard title="Calendario" description="Haz clic en un día para abrir el formulario con esa fecha.">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold capitalize text-slate-900 dark:text-white">{month.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}</h2>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => moveMonth(-1)} aria-label="Mes anterior">‹</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Hoy</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => moveMonth(1)} aria-label="Mes siguiente">›</Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          {weekdays.map(day => <div key={day} className="py-2">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dates.map((day, i) => {
            if (day === null) return <div key={`offset-${i}`} aria-hidden="true" />
            const date = localIso(new Date(month.getFullYear(), month.getMonth(), day))
            return <Link key={date} title={`Registrar visita para el ${date}`} to={`/visitas/nueva?fecha=${date}`} className={`flex min-h-12 items-start justify-center rounded-lg border p-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 ${date === today ? 'border-brand-400 bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200'}`}>{day}</Link>
          })}
        </div>
      </ComponentCard>
      <ComponentCard title="Próximas visitas" description="Los eventos aparecerán aquí al implementar la agenda en la API.">
        <EmptyState title="Sin agenda conectada" description="Todavía no se han cargado visitas programadas desde el servidor." action={<Link className="text-sm font-medium text-brand-600 hover:underline" to="/visitas/nueva">Abrir registro →</Link>} />
      </ComponentCard>
    </div>
  </>
}
