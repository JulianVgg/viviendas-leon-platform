import { memo, useId } from 'react'
import { cn } from '@/app/lib/cn'
import type { Garden } from '../services/gardens'
import type { Cycle } from '../services/cyclesService'

/** SVG estático: no usa canvas, WebGL, animación continua ni imágenes remotas. */
type Props = {
  garden?: Garden
  structure?: 'MACROTUNEL' | 'CAMPO_ABIERTO' | 'MIXTO'
  cycles?: Cycle[]
  className?: string
  compact?: boolean
  showLegend?: boolean
}

type CropShape = 'lechuga' | 'tomate' | 'frijol' | 'zanahoria' | 'hoja'

function cropShape(name: string): CropShape {
  const n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (n.includes('tomate') || n.includes('chile')) return 'tomate'
  if (n.includes('frijol')) return 'frijol'
  if (n.includes('zanahoria') || n.includes('rabano') || n.includes('remolacha')) return 'zanahoria'
  if (n.includes('lechuga') || n.includes('repollo') || n.includes('coliflor') || n.includes('brocoli')) return 'lechuga'
  return 'hoja'
}

function Plant({ x, y, shape, scale = 1 }: { x: number; y: number; shape: CropShape; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <ellipse cx="1" cy="3" rx="10" ry="3.5" fill="#273e23" opacity=".17" />
    {shape === 'tomate' ? <>
      <path d="M0 2V-29 M0 -24l-12-7 M0 -17l10-11 M0 -11l-10-5" stroke="#527842" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M-3-25q-13-13-17-2 8 5 17 2 M2-24q8-13 19-8-4 11-19 8 M0-17q-9-12-17-4 7 7 17 4 M2-14q8-12 18-5-6 10-18 5" fill="#418d52" stroke="#326e41" strokeWidth=".7" />
      <circle cx="-8" cy="-16" r="4" fill="#dd5940" /><circle cx="8" cy="-10" r="4.3" fill="#ea6546" /><circle cx="5" cy="-22" r="3.5" fill="#e58e4c" />
      <circle cx="-9" cy="-17" r="1" fill="#ffd6a8" />
    </> : shape === 'frijol' ? <>
      <path d="M0 1Q-4-15-1-36 M-1-20l-11-9 M0-24l12-8" stroke="#567c42" strokeWidth="2.1" fill="none" strokeLinecap="round" />
      {[-1, 1].map(side => <g key={side} transform={`scale(${side} 1)`}>
        <path d="M2-32Q17-43 21-29 14-22 2-32" fill="#579948" stroke="#367942" strokeWidth=".9" />
        <path d="M0-21Q12-32 16-20 10-14 0-21" fill="#78ab54" stroke="#438449" strokeWidth=".9" />
        <path d="M-3-12Q8-22 15-12 11-5-3-12" fill="#4c8b42" />
      </g>)}
      <path d="M-5-18q-4 6 0 13 M7-23q4 7 0 13" stroke="#a7ba67" strokeWidth="2" fill="none" strokeLinecap="round" />
    </> : shape === 'zanahoria' ? <>
      {Array.from({ length: 9 }, (_, i) => {
        const a = ((i * 57) % 140) - 70
        return <path key={i} d="M0 0q-4-17 1-32" fill="none" stroke={i % 2 ? '#428a43' : '#6ea858'} strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${a / 2})`} />
      })}
      <ellipse cx="0" cy="-4" rx="5" ry="3" fill="#579844" />
    </> : shape === 'lechuga' ? <>
      {Array.from({ length: 8 }, (_, i) => {
        const angle = i * 45
        return <path key={i} d="M0-3 Q-18-17-7-23 Q3-27 8-16 Q13-9 0-3Z" transform={`rotate(${angle} 0 -3)`} fill={i % 2 ? '#79b752' : '#5e9c4b'} stroke="#3c7b40" strokeWidth=".8" />
      })}
      <path d="M-5-5Q-10-20 0-20Q11-18 5-4Q0 2-5-5Z" fill="#b5d77d" stroke="#5a9547" strokeWidth="1" />
    </> : <>
      <path d="M0 2V-25" stroke="#4d7a41" strokeWidth="2" fill="none" />
      <path d="M0-9q-17-18-22-5 10 13 22 5 M0-14q17-18 22-6-10 14-22 6 M0-23q-11-16-15-5 5 10 15 5" fill="#65aa5b" stroke="#3b8544" strokeWidth="1" />
    </>}
  </g>
}

function Scene({ garden, structure, cycles, className, compact = false, showLegend = true }: Props) {
  const token = useId().replace(/:/g, '')
  const entorno = structure ?? garden?.entornoCultivo
  const mixed = entorno === 'MIXTO'
  const tunnel = entorno === 'MACROTUNEL' || mixed
  const active = (cycles ?? []).filter(c => c.estado === 'ACTIVO')
  const shapeList = active.map(c => cropShape(c.cultivo.nombre))
  const themes: CropShape[] = shapeList.length ? shapeList : ['lechuga', 'hoja', 'frijol']
  const beds = Array.from({ length: 5 }, (_, row) => row)
  const plants = beds.flatMap(row => Array.from({ length: 6 }, (_, col) => ({ row, col })))
  const label = entorno === 'MACROTUNEL' ? 'Macrotúnel' : mixed ? 'Mixto' : entorno === 'CAMPO_ABIERTO' ? 'Campo abierto' : 'Huerto'
  return <div className={cn('relative isolate overflow-hidden bg-[#e7f1ed] dark:bg-[#1b3030]', compact ? 'h-44' : 'h-64 sm:h-80', className)}>
    <svg viewBox="0 0 460 280" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Representación ilustrativa de ${label.toLowerCase()} para ${garden?.nombre ?? label.toLowerCase()}`} className="h-full w-full">
      <defs>
        <linearGradient id={`${token}-sky`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#d3e8ec"/><stop offset="1" stopColor="#f4f7ec"/></linearGradient>
        <linearGradient id={`${token}-soil`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#896545"/><stop offset=".55" stopColor="#ad7851"/><stop offset="1" stopColor="#65462e"/></linearGradient>
        <linearGradient id={`${token}-cover`} x1="0" y1="0" x2="1" y2=".45"><stop stopColor="#f7feff" stopOpacity=".68"/><stop offset=".5" stopColor="#d4f3f4" stopOpacity=".31"/><stop offset="1" stopColor="#f8ffff" stopOpacity=".65"/></linearGradient>
        <filter id={`${token}-blur`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>
        <radialGradient id={`${token}-light`} cx=".75" cy=".15" r=".9"><stop stopColor="#fff5d3" stopOpacity=".72"/><stop offset="1" stopColor="#f2fff5" stopOpacity="0"/></radialGradient>
        <pattern id={`${token}-furrow`} width="16" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><path d="M0 3Q7 0 16 3" fill="none" stroke="#e7b98a" strokeOpacity=".16" strokeWidth="1.8" /></pattern>
      </defs>
      <rect width="460" height="280" fill={`url(#${token}-sky)`} />
      <rect width="460" height="280" fill={`url(#${token}-light)`} />
      <g fill="#ffffff" opacity=".58"><ellipse cx="94" cy="41" rx="35" ry="8"/><ellipse cx="120" cy="40" rx="25" ry="11"/><ellipse cx="345" cy="52" rx="41" ry="9" /></g>
      <path d="M0 120Q46 92 96 108T202 115Q278 74 333 110T460 92V280H0Z" fill="#abc8b4" opacity=".44" />
      <path d="M0 158Q80 128 152 150T310 138Q374 114 460 145V280H0Z" fill="#88b59a" opacity=".32" />
      <ellipse cx="230" cy="222" rx="167" ry="37" fill="#476c54" opacity=".28" filter={`url(#${token}-blur)`} />
      {/* Plataforma de tierra con caras laterales y borde herboso. */}
      <path d="M46 161L261 82 425 155 211 245Z" fill="#76a563" stroke="#608a58" strokeWidth="2" />
      <path d="M46 161L211 245 211 262 46 180Z" fill="#876343" />
      <path d="M211 245L425 155 425 175 211 262Z" fill="#6e543c" />
      <path d="M65 163L261 92 405 155 211 234Z" fill={`url(#${token}-soil)`} stroke="#795738" strokeWidth="2" />
      <path d="M65 163L261 92 405 155 211 234Z" fill={`url(#${token}-furrow)`} />
      <path d="M64 162L211 234 404 155" fill="none" stroke="#c49b67" strokeWidth="3" strokeOpacity=".62" />
      <g stroke="#567e4e" strokeWidth="1.5" opacity=".65" fill="none"><path d="M58 181l9-5 8 5m-1 12 7-4m266-22 11 5 6-3m-14-11 7-5" /></g>
      {/* Cercado de campo abierto: postes y hilos con profundidad, sin texturas externas. */}
      {(!tunnel || mixed) && <g opacity=".83" strokeLinecap="round">
        <path d="M63 156L260 85 404 148" fill="none" stroke="#c3aa82" strokeWidth="2" />
        <path d="M63 149L260 78 404 141" fill="none" stroke="#8c714d" strokeWidth="1.2" />
        {[[65,160],[115,142],[166,124],[214,106],[260,89],[307,109],[354,131],[404,153]].map(([x,y],i) => <g key={i}><path d={`M${x} ${y}v-18`} stroke="#866847" strokeWidth="3.2"/><path d={`M${x-1} ${y-18}h3`} stroke="#c5a778" strokeWidth="2" /></g>)}
      </g>}
      {/* Camas isométricas con vegetación detallada, sin animaciones. */}
      {beds.map(row => {
        const cx = 95 + row * 22
        const cy = 155 + row * 10
        return <g key={row}>
          <path d={`M${cx} ${cy} l122 -46 22 10 -121 47Z`} fill={row % 2 ? '#5c5037' : '#56442c'} />
          <path d={`M${cx} ${cy - 4} l122 -46 20 9 -121 46Z`} fill={row % 2 ? '#806043' : '#a3774f'} stroke="#70583c" strokeWidth=".7" />
        </g>
      })}
      {plants.map(({ row, col }) => {
        const x = 101 + row * 22 + col * 19.5
        const y = 154 + row * 10 - col * 7.25
        const shape = themes[(row + Math.floor(col / 2)) % themes.length]
        return <Plant key={`${row}-${col}`} x={x} y={y} shape={shape} scale={0.41 + row * 0.018} />
      })}
      {/* Caminos entre camas y riego superficial. */}
      <path d="M85 178q62 42 134 57" fill="none" stroke="#d6b28b" strokeWidth="2" opacity=".57" strokeLinecap="round" />
      <path d="M96 169l133-51 M111 185l133-51 M133 198l133-51" stroke="#223f36" strokeWidth="1.2" opacity=".28" fill="none" />
      {/* Entorno agroforestal y cortina vegetal, si está declarada. */}
      {garden?.modalidadesProductivas.some(m => m === 'AGROFORESTAL' || m === 'SILVOPASTORIL') && <g>
        <path d="M51 119v41 M87 100v43" stroke="#815b37" strokeWidth="5" />
        <circle cx="51" cy="116" r="23" fill="#588b50" opacity=".9" /><circle cx="39" cy="105" r="15" fill="#79ab63" />
        <circle cx="87" cy="97" r="22" fill="#568c55" /><circle cx="98" cy="89" r="17" fill="#80b06e" />
      </g>}
      {/* Macrotúnel transparente. En mixto ocupa sólo parte del huerto. */}
      {tunnel && <g transform={mixed ? 'translate(58 6) scale(.72 .76)' : 'translate(0 0)'}>
        <path d="M119 174L269 113 377 164 229 226Z" fill="#c5dfcf" opacity=".4" />
        <path d="M119 174 Q121 93 174 112 L323 59 Q369 58 377 164 L229 226 Q228 151 174 163Z" fill={`url(#${token}-cover)`} stroke="#c2e4e6" strokeWidth="1.7" />
        <path d="M119 174Q121 94 174 112L323 59Q369 58 377 164" fill="none" stroke="#d6edf0" strokeWidth="3.3" />
        <path d="M128 164Q136 117 164 118L308 68Q346 70 363 135" fill="none" stroke="#ffffff" strokeOpacity=".8" strokeWidth="1.2" strokeDasharray="18 7 4 9" />
        {[0, 1, 2, 3].map(i => <path key={i} d={`M${119 + i * 35} ${174 - i * 14} Q${122 + i * 35} ${94 - i * 14} ${174 + i * 35} ${112 - i * 14} L${229 + i * 35} ${226 - i * 14}`} fill="none" stroke="#eaf9fc" strokeWidth="2.8" opacity=".94" />)}
        <path d="M174 112L323 59M174 163L323 110M229 226L377 164" stroke="#7baab2" strokeWidth="1.4" fill="none" opacity=".75" />
        <path d="M174 163Q227 151 229 226" fill="none" stroke="#b8dce3" strokeWidth="2" />
        <path d="M119 174L229 226 377 164" fill="none" stroke="#a0bac1" strokeWidth="2.4" />
      </g>}
      {/* Esquinas y postes con sombra. */}
      {[ [46,161], [261,82], [425,155], [211,245] ].map(([x,y],i) => <g key={i}><path d={`M${x} ${y}v-9`} stroke="#a77a50" strokeWidth="3" strokeLinecap="round"/><circle cx={x} cy={y-10} r="2" fill="#d2ab75"/></g>)}
    </svg>
    {showLegend && active.length > 0 && <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
      {Array.from(new Set(active.map(c => c.cultivo.nombre))).slice(0, 3).map(name => <span key={name} className="rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-100">{name}</span>)}
    </div>}
    <span className="sr-only">Modelo ilustrativo sin medidas físicas registradas.</span>
  </div>
}

export default memo(Scene)
