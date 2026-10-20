import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ListFilter, Plus, RefreshCw } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/AuthProvider'
import { isDireccionGeneral } from '@/features/auth/screenPermissions'
import InstitutionalEventDialog from '../components/InstitutionalEventDialog'
import { categories, loadEvents, loadParticipants, removeEvent, saveEvent, type CalendarEvent, type CalendarEventInput, type CalendarPerson, type InstitutionalCategory } from '../services/calendarService'

const monthLabels = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const weekLabels = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const todayKey = () => dateKey(new Date())
function dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function readableDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString('es-GT', {day:'numeric',month:'short',year:'numeric'}) }
function roleNormal(role: string) { return role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() }
const eventClass = (cat: InstitutionalCategory) => categories.find(c=>c.id===cat)?.className ?? categories[6].className
const eventCategory = (cat: InstitutionalCategory) => categories.find(c=>c.id===cat)?.text ?? 'Otro'

export default function InstitutionalCalendarPage() {
  const { usuario } = useAuth()
  const editable = Boolean(usuario && (isDireccionGeneral(usuario) || usuario.roles.some(role => roleNormal(role) === 'coordinadora del programa agroforestal')))
  const [month,setMonth] = useState(() => {const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)})
  const [items,setItems] = useState<CalendarEvent[]>([])
  const [users,setUsers] = useState<CalendarPerson[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [categoryFilter,setCategoryFilter] = useState<'TODAS' | InstitutionalCategory>('TODAS')
  const [selected,setSelected] = useState<CalendarEvent|null>(null)
  const [date,setDate] = useState<string>(todayKey())
  const [open,setOpen] = useState(false)
  const [dayList,setDayList] = useState<string|null>(null)
  const monthCells = useMemo(() => {
    const offset = (new Date(month.getFullYear(),month.getMonth(),1).getDay()+6)%7
    const n = Math.ceil((offset+new Date(month.getFullYear(),month.getMonth()+1,0).getDate())/7)*7
    return Array.from({length:n},(_,i)=>{
      const d=new Date(month.getFullYear(),month.getMonth(),i-offset+1)
      return {key:dateKey(d),number:d.getDate(),inMonth:d.getMonth()===month.getMonth()}
    })
  },[month])
  const rangeStart = monthCells[0]?.key ?? todayKey()
  const rangeEnd = monthCells[monthCells.length-1]?.key ?? todayKey()
  const refresh = useCallback(async () => {
    setLoading(true);setError('')
    try {
      const [events, people] = await Promise.all([loadEvents(rangeStart, rangeEnd), loadParticipants()])
      setItems(events);setUsers(people)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error cargando calendario.') }
    finally { setLoading(false) }
  },[rangeStart,rangeEnd])
  useEffect(()=>{void refresh()},[refresh])
  const filtered = useMemo(()=>categoryFilter==='TODAS' ? items : items.filter(e=>e.categoria===categoryFilter),[items,categoryFilter])
  const byDate = useMemo(()=>{
    const map=new Map<string,CalendarEvent[]>()
    for(const {key} of monthCells) map.set(key,[])
    for (const event of filtered) for (const cell of monthCells) if(cell.key>=event.fechaInicio && cell.key<=event.fechaFin) map.get(cell.key)?.push(event)
    return map
  },[monthCells,filtered])
  const upcoming = useMemo(()=>filtered.filter(e=>e.fechaFin>=todayKey()).sort((a,b)=>a.fechaInicio.localeCompare(b.fechaInicio)).slice(0,7),[filtered])
  const openCreate = (day=todayKey()) => {if (!editable) return;setSelected(null);setDate(day);setOpen(true)}
  const openEvent = (event:CalendarEvent) => {setSelected(event);setDate(event.fechaInicio);setDayList(null);setOpen(true)}
  const save = async (payload:CalendarEventInput,id?:number) => {await saveEvent(payload,id);await refresh()}
  const erase = async (id:number) => {await removeEvent(id);await refresh()}
  const changeMonth = (n:number) => setMonth(d=>new Date(d.getFullYear(),d.getMonth()+n,1))
  const viewDayItems=dayList ? byDate.get(dayList)??[] : []

  return <>
    <PageMeta title="Calendario institucional | Viviendas León" description="Actividades, reuniones y eventos de la organización"/>
    <PageHeader title="Calendario institucional" description="Agenda general de la organización. La agenda de visitas técnicas se gestiona por separado."
      actions={editable ? <Button type="button" onClick={()=>openCreate()}><Plus size={17}/> Nuevo evento</Button> : undefined}/>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><CalendarDays size={16} className="text-brand-500"/>{editable ? 'Dirección y Coordinación pueden programar y editar.' : 'Consulta de eventos institucionales · solo lectura.'}</div>
      <div className="flex items-center gap-2"><ListFilter size={17} className="text-gray-400"/><label className="sr-only" htmlFor="institutional-filter">Filtrar categoría</label><select id="institutional-filter" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value as 'TODAS'|InstitutionalCategory)} className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"><option value="TODAS">Todas las categorías</option>{categories.map(c=><option key={c.id} value={c.id}>{c.text}</option>)}</select><Button variant="secondary" size="sm" type="button" onClick={()=>void refresh()} aria-label="Actualizar calendario"><RefreshCw size={17}/></Button></div>
    </div>
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900" aria-label="Calendario mensual">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-800 sm:p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold capitalize text-gray-800 dark:text-white"><CalendarDays size={19} className="text-brand-500"/>{monthLabels[month.getMonth()]} {month.getFullYear()}</h2>
          <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={()=>changeMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={17}/></Button><Button size="sm" variant="secondary" onClick={()=>{const d=new Date();setMonth(new Date(d.getFullYear(),d.getMonth(),1))}}>Hoy</Button><Button size="sm" variant="secondary" onClick={()=>changeMonth(1)} aria-label="Mes siguiente"><ChevronRight size={17}/></Button></div>
        </div>
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-800/50">{weekLabels.map(d=><div key={d} className="py-3">{d}</div>)}</div>
        <div className="grid grid-cols-7">{monthCells.map(cell=>{
          const events=byDate.get(cell.key)??[]
          return <div key={cell.key} onDoubleClick={()=>openCreate(cell.key)} className={`min-h-26 border-b border-r border-gray-100 p-1.5 transition-colors sm:min-h-35 sm:p-2 dark:border-gray-800 ${cell.inMonth?'':'bg-gray-50/70 dark:bg-gray-800/30'} ${editable?'hover:bg-brand-50/25':''}`}>
            <button type="button" onClick={()=>editable?openCreate(cell.key):setDayList(cell.key)} className={`mb-1 flex size-7 items-center justify-center rounded-full text-xs font-semibold ${cell.key===todayKey()?'bg-brand-500 text-white':cell.inMonth?'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700':'text-gray-400'}`} title={editable?'Crear evento para este día':'Ver eventos del día'}>{cell.number}</button>
            <div className="space-y-1">{events.slice(0,3).map(e=><button key={e.id} type="button" onDoubleClick={evt=>evt.stopPropagation()} onClick={()=>openEvent(e)} title={`${e.titulo} · ${e.responsable.nombre}`} className={`block w-full truncate rounded-md border px-1.5 py-1 text-left text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-brand-500 sm:text-xs ${eventClass(e.categoria)}`}>{e.titulo}</button>)}{events.length>3 && <button type="button" onClick={()=>setDayList(cell.key)} className="w-full text-left text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">+{events.length-3} más</button>}</div>
          </div>
        })}</div>
        {loading && <p role="status" className="border-t border-gray-100 p-3 text-center text-sm text-gray-500 dark:border-gray-800">Cargando eventos…</p>}
      </section>
      <aside className="h-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 p-4 dark:border-gray-800"><h2 className="font-semibold text-gray-900 dark:text-white">Próximas actividades</h2><p className="text-xs text-gray-500">Eventos visibles del período seleccionado</p></div>
        <div className="max-h-130 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">{upcoming.length ? upcoming.map(e=><button key={e.id} type="button" onClick={()=>openEvent(e)} className="block w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-white/5"><span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${eventClass(e.categoria)}`}>{eventCategory(e.categoria)}</span><span className="mt-2 block text-sm font-semibold text-gray-900 dark:text-white">{e.titulo}</span><span className="mt-1 block text-xs text-gray-500">{readableDate(e.fechaInicio)}{e.fechaFin!==e.fechaInicio ? ` — ${readableDate(e.fechaFin)}` : ''}</span><span className="mt-1 block text-xs text-gray-500">{e.responsable.nombre}</span></button>) : <p className="p-5 text-sm text-gray-500">No hay eventos próximos en este período.</p>}</div>
        <div className="border-t border-gray-100 p-3 text-center text-xs text-gray-500 dark:border-gray-800">Las notificaciones automáticas se integrarán en una etapa posterior.</div>
      </aside>
    </div>
    <InstitutionalEventDialog open={open} onClose={()=>setOpen(false)} selected={selected} date={date} users={users} currentUserId={usuario?.id??0} editable={editable} onSave={save} onDelete={erase}/>
    <Dialog open={dayList!==null} title={dayList ? `Actividades del ${readableDate(dayList)}` : 'Actividades'} description="Selecciona un evento para consultar sus detalles." onClose={()=>setDayList(null)}>
      <div className="space-y-2">{viewDayItems.map(e=><button key={e.id} onClick={()=>openEvent(e)} className={`block w-full rounded-lg border p-3 text-left text-sm ${eventClass(e.categoria)}`}><span className="block font-semibold">{e.titulo}</span><span className="text-xs">{e.responsable.nombre}</span></button>)}</div>
      {!viewDayItems.length && <p className="text-sm text-gray-500">No hay eventos para este día.</p>}
      {editable && dayList && <div className="mt-4 flex justify-end"><Button type="button" onClick={()=>{const d=dayList;setDayList(null);openCreate(d)}}><Plus size={16}/> Nuevo evento</Button></div>}
    </Dialog>
  </>
}
