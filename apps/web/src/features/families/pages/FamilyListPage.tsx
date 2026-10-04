import { Link } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import ComponentCard from '@/components/common/ComponentCard'
import DataTableContainer from '@/components/common/DataTableContainer'

const rows = [
  ['Familia de muestra 01', 'Comunidad de muestra', 'Programa base', 'Pendiente'],
  ['Familia de muestra 02', 'Comunidad de muestra', 'Programa base', 'Pendiente'],
]

export default function FamilyListPage() {
  return <><PageMeta title="Familias y beneficiarios | Viviendas León Guatemala" description="Vista base de familias y beneficiarios." /><PageHeader title="Familias y beneficiarios" description="Consulta y seguimiento de familias participantes, comunidades y programas asociados." /><ComponentCard title="Listado de familias" description="Datos de muestra para validar la estructura visual."><DataTableContainer columns={['Familia', 'Comunidad', 'Programa', 'Estado']} rows={rows.map((row, index) => [<Link key={row[0]} to={`/familias/${index + 1}`} className="font-medium text-blue-600 hover:text-blue-700">{row[0]}</Link>, ...row.slice(1)])} /></ComponentCard></>
}
