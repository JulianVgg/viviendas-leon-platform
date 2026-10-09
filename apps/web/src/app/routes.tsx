import { Route, Routes } from 'react-router'
import AppLayout from '@/app/layout/AppLayout'
import DashboardPage from '@/app/pages/DashboardPage'
import ModulePage from '@/components/common/ModulePage'
import FamilyListPage from '@/features/families/pages/FamilyListPage'
import FamilyCreatePage from '@/features/families/pages/FamilyCreatePage'
import FamilyDetailPage from '@/features/families/pages/FamilyDetailPage'
import OfflineTestPage from '@/features/offline/pages/OfflineTestPage'
import OfflineOperationsTestPage from '@/features/offline/pages/OfflineOperationsTestPage'
import OfflineQueueTestPage from '@/features/offline/pages/OfflineQueueTestPage'
const module = (title: string, description: string, columns: string[]) => <ModulePage title={title} description={description} columns={columns} />

export default function AppRoutes() {
  return <Routes><Route element={<AppLayout />}><Route index element={<DashboardPage />} /><Route path="familias" element={<FamilyListPage />} />{import.meta.env.DEV && (
  <Route path="offline-test" element={<OfflineTestPage />} />
)}
{import.meta.env.DEV && (
  <Route
    path="offline-operations-test"
    element={<OfflineOperationsTestPage />}
  />
)}
{import.meta.env.DEV && (
  <Route
    path="offline-queue-test"
    element={<OfflineQueueTestPage />}
  />
)}
  <Route path="familias/nueva" element={<FamilyCreatePage />} />
  <Route path="familias/:id" element={<FamilyDetailPage />} />
  <Route path="gestion-agricola" element={module('Gestión agrícola', 'Seguimiento general de huertos, cultivos, producción, control fitosanitario e insumos.', ['Área', 'Estado'])} /><Route path="gestion-agricola/huertos" element={module('Huertos', 'Registro base para huertos familiares y comunitarios.', ['Huerto', 'Responsable', 'Estado'])} /><Route path="gestion-agricola/cultivos" element={module('Cultivos', 'Estructura base para cultivos y ciclos productivos.', ['Cultivo', 'Ciclo', 'Estado'])} /><Route path="gestion-agricola/produccion" element={module('Producción', 'Vista base para el seguimiento de producción agrícola.', ['Periodo', 'Cultivo', 'Resultado'])} /><Route path="gestion-agricola/control-fitosanitario" element={module('Control fitosanitario', 'Vista base para seguimiento y alertas fitosanitarias.', ['Fecha', 'Huerto', 'Estado'])} /><Route path="gestion-agricola/insumos" element={module('Insumos', 'Vista base para insumos de programas agrícolas.', ['Insumo', 'Disponibilidad', 'Asignación'])} /><Route path="actividades" element={module('Actividades de campo', 'Seguimiento general de visitas, asistencia técnica y capacitaciones.', ['Actividad', 'Responsable', 'Estado'])} /><Route path="actividades/visitas" element={module('Visitas', 'Registro base para visitas de campo.', ['Familia', 'Responsable', 'Fecha', 'Estado'])} /><Route path="actividades/asistencia-tecnica" element={module('Asistencia técnica', 'Registro base para acompañamiento técnico.', ['Tema', 'Responsable', 'Fecha', 'Estado'])} /><Route path="actividades/capacitaciones" element={module('Capacitaciones', 'Registro base para capacitaciones y participantes.', ['Actividad', 'Fecha', 'Responsable', 'Estado'])} /><Route path="voluntariado" element={module('Voluntariado', 'Placeholder visual conservado hasta confirmar su alcance oficial.', ['Actividad', 'Institución', 'Estado'])} /><Route path="reportes" element={module('Reportes', 'Espacio base para reportes y futuras exportaciones.', ['Reporte', 'Módulo', 'Estado'])} /><Route path="reportes/reportes" element={module('Reportes', 'Vista base para reportes operativos.', ['Reporte', 'Periodo', 'Estado'])} /><Route path="reportes/indicadores" element={module('Indicadores', 'Vista base para indicadores de seguimiento.', ['Indicador', 'Periodo', 'Valor'])} /><Route path="reportes/alertas" element={module('Alertas', 'Vista base para alertas y seguimiento.', ['Alerta', 'Prioridad', 'Estado'])} /><Route path="administracion" element={module('Administración', 'Espacio base para configuración administrativa.', ['Sección', 'Estado'])} /><Route path="administracion/usuarios" element={module('Usuarios', 'Vista base para la futura gestión de usuarios.', ['Usuario', 'Rol', 'Estado'])} /><Route path="administracion/roles-permisos" element={module('Roles y permisos', 'Vista base para roles y permisos.', ['Rol', 'Descripción', 'Estado'])} /><Route path="administracion/configuracion" element={module('Configuración', 'Vista base para preferencias y parámetros.', ['Sección', 'Estado'])} /><Route path="auditoria" element={module('Auditoría', 'Espacio base para trazabilidad.', ['Módulo', 'Operaciones', 'Estado'])} /><Route path="auditoria/bitacora" element={module('Bitácora', 'Vista base para operaciones y cambios realizados.', ['Usuario', 'Fecha', 'Operación', 'Módulo'])} /></Route><Route path="*" element={module('Página no encontrada', 'La página solicitada no existe.', ['Estado'])} /></Routes>
}
