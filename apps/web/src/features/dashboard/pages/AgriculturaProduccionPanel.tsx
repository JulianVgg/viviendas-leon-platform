import { useMemo, useState } from 'react'
import { BarChart3, CalendarDays, Leaf, PackageCheck, Scale, Sprout, UsersRound } from 'lucide-react'
import type { IndicadoresAgricolas } from '../services/dashboardSummaryService'
import { ProBarChart } from '../charts/TailAdminCharts'
import { seriesProduccion, seriesComunidadesAgricolas } from '../lib/chartSeries'

const panel = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'
const numero = (value:number) => value.toLocaleString('es-GT',{maximumFractionDigits:2})

export default function AgriculturaProduccionPanel({datos}: {datos:IndicadoresAgricolas}) {
  const [cultivoSeleccionado,setCultivoSeleccionado] = useState<number|null>(null)
  const [modo,setModo] = useState<'kg'|'unidades'>('kg')
  const cultivo = useMemo(()=>datos.porCultivo.find(item=>item.id===cultivoSeleccionado),[cultivoSeleccionado,datos.porCultivo])
  const tarjetas = [
    {nombre:'Ciclos activos',valor:datos.indicadores.ciclosActivos,icono:Sprout},
    {nombre:'Cultivos activos',valor:datos.indicadores.variedadesActivas,icono:Leaf},
    {nombre:'Plantas iniciales',valor:datos.indicadores.plantasActivas,icono:UsersRound},
    {nombre:'Registros de producción',valor:datos.indicadores.registrosProduccion,icono:PackageCheck},
    {nombre:'Producción (kg)',valor:datos.indicadores.produccionKg,icono:Scale},
    {nombre:'Producción (unidades)',valor:datos.indicadores.produccionUnidades,icono:BarChart3},
  ]
  const produccion = seriesProduccion(datos, modo)
  const comunidades = seriesComunidadesAgricolas(datos)
  return <section aria-label="MON-04 · Indicadores agrícolas y producción" className="space-y-4">
    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agricultura y producción</h2>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {tarjetas.map(item=><div key={item.nombre} className={`${panel} !p-4 transition-shadow duration-300 hover:shadow-md`}>
        <item.icono size={19} className="mb-3 text-brand-600" strokeWidth={1.7}/>
        <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{numero(item.valor)}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.nombre}</p>
      </div>)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className={panel}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><CalendarDays size={17} className="text-brand-600"/><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Producción por mes</h3></div>
          <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-gray-700" role="group" aria-label="Unidad del gráfico">
            {(['kg','unidades'] as const).map(opcion=><button key={opcion} type="button" onClick={()=>setModo(opcion)} aria-pressed={modo===opcion}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${modo===opcion?'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300':'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{opcion==='kg'?'Kilogramos':'Unidades'}</button>)}
          </div>
        </div>
        {datos.produccionMensual.some(item => item[modo] > 0) ? <ProBarChart
          labels={produccion.labels.map(mes => new Intl.DateTimeFormat('es-GT',{month:'short',timeZone:'UTC'}).format(new Date(`${mes}-15T12:00:00Z`)))}
          series={produccion.series} ariaLabel={`Producción registrada por mes en ${modo}`}
          height={235} unit={modo} colors={['#3C6E8E']}/>
          : <p className="py-20 text-center text-sm text-gray-500">Sin producción registrada en {modo}.</p>}
        <div className="mt-3 flex justify-between gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800">
          <span>{datos.indicadores.ciclosFinalizados} ciclos finalizados</span>
          <span>{datos.visitasConProduccion} visitas con producción reportada</span>
        </div>
      </div>
      <div className={panel}>
        <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">Cultivos</h3>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {datos.porCultivo.map(item=><button key={item.id} type="button" onClick={()=>setCultivoSeleccionado(v=>v===item.id?null:item.id)} aria-pressed={item.id===cultivoSeleccionado}
            className={`w-full rounded-xl border p-3 text-left transition-colors ${item.id===cultivoSeleccionado?'border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-500/10':'border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800'}`}>
            <span className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-sm font-medium text-gray-800 dark:text-white">{item.nombre}</span><span className="shrink-0 text-xs text-gray-500">{item.activos} activos</span></span>
            <span className="mt-1 block text-xs text-gray-500">{numero(item.plantas)} plantas · {numero(item.kg)} kg · {numero(item.unidades)} unidades</span>
          </button>)}
          {!datos.porCultivo.length && <p className="text-sm text-gray-500">Sin siembras registradas.</p>}
        </div>
        {cultivo && <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300" aria-live="polite">
          <span className="font-semibold">{cultivo.nombre}</span><span className="mt-1 block">{cultivo.ciclos} ciclos registrados · {cultivo.activos} activos</span>
        </div>}
      </div>
    </div>
    <div className={panel}>
      <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">Siembras por comunidad</h3>
      {datos.porComunidad.length > 0 && <ProBarChart labels={comunidades.labels} series={comunidades.series}
        ariaLabel="Ciclos activos y familias por comunidad" horizontal
        height={Math.max(220, datos.porComunidad.length * 55)} colors={['#3C6E8E','#15A38D']}/>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {datos.porComunidad.map(item=><div key={item.nombre} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-white" title={item.nombre}>{item.nombre}</p>
          <p className="mt-2 text-xs text-gray-500">{item.ciclosActivos} ciclos activos · {item.familias} familias</p>
        </div>)}
        {!datos.porComunidad.length && <p className="text-sm text-gray-500">Sin registros agrícolas.</p>}
      </div>
      {datos.indicadores.unidadesNoComparables>0 && <p className="mt-3 text-xs text-gray-500">Hay producción registrada en otras unidades; no se suma a kg o unidades.</p>}
    </div>
  </section>
}
