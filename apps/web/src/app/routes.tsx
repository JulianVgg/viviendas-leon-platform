
import { Navigate, Route, Routes } from 'react-router'
import AppLayout from '@/app/layout/AppLayout'
import DashboardPage from '@/app/pages/DashboardPage'
import ModulePage from '@/components/common/ModulePage'

import FamilyListPage from '@/features/families/pages/FamilyListPage'
import FamilyCreatePage from '@/features/families/pages/FamilyCreatePage'
import FamilyDetailPage from '@/features/families/pages/FamilyDetailPage'
import FamilyEditPage from '@/features/families/pages/FamilyEditPage'

import OfflineTestPage from '@/features/offline/pages/OfflineTestPage'
import OfflineOperationsTestPage from '@/features/offline/pages/OfflineOperationsTestPage'
import OfflineQueueTestPage from '@/features/offline/pages/OfflineQueueTestPage'
import OfflineConnectivityTestPage from '@/features/offline/pages/OfflineConnectivityTestPage'
import OfflineSyncTestPage from '@/features/offline/pages/OfflineSyncTestPage'

import VisitAgendaPage from '@/features/visits/pages/VisitAgendaPage'
import VisitRegisterPage from '@/features/visits/pages/VisitRegisterPage'
import VisitHistoryPage from '@/features/visits/pages/VisitHistoryPage'
import InstitutionalCalendarPage from '@/features/calendar/pages/InstitutionalCalendarPage'
import NotificacionesPage from '@/features/notifications/pages/NotificacionesPage'
import TrainingAgendaPage from '@/features/training/pages/TrainingAgendaPage'
import TrainingRegisterPage from '@/features/training/pages/TrainingRegisterPage'
import TrainingHistoryPage from '@/features/training/pages/TrainingHistoryPage'

// AUTH-02: Autenticación
import LoginPage from '@/features/auth/pages/LoginPage'
import ProtectedRoute from '@/features/auth/components/ProtectedRoute'

// AUTH-04: Cambio obligatorio de contraseña
import EstablecerPasswordPage from '@/features/auth/pages/EstablecerPasswordPage'

// AUTH-04: Perfil del usuario autenticado
import MiPerfilPage from '@/features/profile/pages/MiPerfilPage'

// AUTH-04: Administración de usuarios, roles y permisos
import UsuariosPage from '@/features/admin/pages/UsuariosPage'
import RolesPermisosPage from '@/features/admin/pages/RolesPermisosPage'
import CommunitiesPage from '@/features/catalogs/pages/CommunitiesPage'
import MunicipalitiesPage from '@/features/catalogs/pages/MunicipalitiesPage'
import ProgramsPage from '@/features/catalogs/pages/ProgramsPage'
import DirectoraRoute from '@/features/auth/components/DirectoraRoute'

const module = (
  title: string,
  description: string,
  columns: string[],
) => (
  <ModulePage
    title={title}
    description={description}
    columns={columns}
  />
)

export default function AppRoutes() {
  return (
    <Routes>

      {/* Inicio de sesión */}
      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* Rutas que requieren autenticación */}
      <Route element={<ProtectedRoute />}>

        {/* AUTH-04: Primera contraseña obligatoria */}
        <Route
          path="establecer-password"
          element={<EstablecerPasswordPage />}
        />

        {/* Diseño principal de Viviendas León */}
        <Route element={<AppLayout />}>

          {/* NTF-02: Centro de notificaciones personales */}
          <Route path="notificaciones" element={<NotificacionesPage />} />

          {/* Dashboard */}
          <Route
            index
            element={<DashboardPage />}
          />

          {/* AUTH-04: Mi perfil */}
          <Route
            path="mi-perfil"
            element={<MiPerfilPage />}
          />

          {/* Familias */}
          <Route
            path="familias"
            element={<FamilyListPage />}
          />

          {/* Pruebas offline: solo desarrollo */}
          {import.meta.env.DEV && (
            <Route
              path="offline-test"
              element={<OfflineTestPage />}
            />
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

          {import.meta.env.DEV && (
            <Route
              path="offline-connectivity-test"
              element={<OfflineConnectivityTestPage />}
            />
          )}

          {import.meta.env.DEV && (
            <Route
              path="offline-sync-test"
              element={<OfflineSyncTestPage />}
            />
          )}

          {/* Calendario institucional (distinto de la agenda técnica) */}
          <Route path="calendario" element={<InstitutionalCalendarPage />} />

          {/* Visitas técnicas */}
          <Route
            path="visitas"
            element={
              <Navigate
                to="/visitas/agenda"
                replace
              />
            }
          />

          <Route
            path="visitas/agenda"
            element={<VisitAgendaPage />}
          />

          <Route
            path="actividades/visitas"
            element={
              <Navigate
                to="/visitas/agenda"
                replace
              />
            }
          />

          <Route
            path="visitas/nueva"
            element={<VisitRegisterPage />}
          />

          <Route
            path="visitas/historial"
            element={<VisitHistoryPage />}
          />

          {/* Registro de familias */}
          <Route
            path="familias/nueva"
            element={<FamilyCreatePage />}
          />

          <Route
            path="familias/editar"
            element={<FamilyListPage mode="edit" />}
          />

          <Route
            path="familias/:id/editar"
            element={<FamilyEditPage />}
          />

          <Route
            path="familias/:id"
            element={<FamilyDetailPage />}
          />

          {/* Gestión agrícola */}
          <Route
            path="gestion-agricola"
            element={module(
              'Gestión agrícola',
              'Seguimiento general de huertos, cultivos, producción, control fitosanitario e insumos.',
              ['Área', 'Estado'],
            )}
          />

          <Route
            path="gestion-agricola/huertos"
            element={module(
              'Huertos',
              'Registro base para huertos familiares y comunitarios.',
              ['Huerto', 'Responsable', 'Estado'],
            )}
          />

          <Route
            path="gestion-agricola/cultivos"
            element={module(
              'Cultivos',
              'Estructura base para cultivos y ciclos productivos.',
              ['Cultivo', 'Ciclo', 'Estado'],
            )}
          />

          <Route
            path="gestion-agricola/produccion"
            element={module(
              'Producción',
              'Vista base para el seguimiento de producción agrícola.',
              ['Periodo', 'Cultivo', 'Resultado'],
            )}
          />

          <Route
            path="gestion-agricola/control-fitosanitario"
            element={module(
              'Control fitosanitario',
              'Vista base para seguimiento y alertas fitosanitarias.',
              ['Fecha', 'Huerto', 'Estado'],
            )}
          />

          <Route
            path="gestion-agricola/insumos"
            element={module(
              'Insumos',
              'Vista base para insumos de programas agrícolas.',
              ['Insumo', 'Disponibilidad', 'Asignación'],
            )}
          />

          {/* Actividades de campo */}
          <Route
            path="actividades"
            element={module(
              'Actividades de campo',
              'Seguimiento general de visitas, asistencia técnica y capacitaciones.',
              ['Actividad', 'Responsable', 'Estado'],
            )}
          />

          <Route
            path="actividades/asistencia-tecnica"
            element={module(
              'Asistencia técnica',
              'Registro base para acompañamiento técnico.',
              ['Tema', 'Responsable', 'Fecha', 'Estado'],
            )}
          />

          <Route
            path="actividades/capacitaciones"
            element={<TrainingAgendaPage />}
          />
          <Route path="actividades/capacitaciones/registrar" element={<TrainingRegisterPage />} />
          <Route path="actividades/capacitaciones/historial" element={<TrainingHistoryPage />} />

          {/* Voluntariado */}
          <Route
            path="voluntariado"
            element={module(
              'Voluntariado',
              'Placeholder visual conservado hasta confirmar su alcance oficial.',
              ['Actividad', 'Institución', 'Estado'],
            )}
          />

          {/* Reportes */}
          <Route
            path="reportes"
            element={module(
              'Reportes',
              'Espacio base para reportes y futuras exportaciones.',
              ['Reporte', 'Módulo', 'Estado'],
            )}
          />

          <Route
            path="reportes/reportes"
            element={module(
              'Reportes',
              'Vista base para reportes operativos.',
              ['Reporte', 'Periodo', 'Estado'],
            )}
          />

          <Route
            path="reportes/indicadores"
            element={module(
              'Indicadores',
              'Vista base para indicadores de seguimiento.',
              ['Indicador', 'Periodo', 'Valor'],
            )}
          />

          <Route
            path="reportes/alertas"
            element={module(
              'Alertas',
              'Vista base para alertas y seguimiento.',
              ['Alerta', 'Prioridad', 'Estado'],
            )}
          />

          {/* Administración general */}
          <Route
            path="administracion"
            element={module(
              'Administración',
              'Espacio base para configuración administrativa.',
              ['Sección', 'Estado'],
            )}
          />

          {/* FAM-06: Comunidades (Dirección general y Coordinación autorizada) */}
          <Route path="administracion/comunidades" element={<CommunitiesPage />} />
          <Route path="administracion/municipios" element={<MunicipalitiesPage />} />
          <Route path="administracion/programas" element={<ProgramsPage />} />

          {/* AUTH-04: Acceso exclusivo de Directora */}
          <Route element={<DirectoraRoute />}>

            {/* Administración de usuarios */}
            <Route
              path="administracion/usuarios"
              element={<UsuariosPage />}
            />

            {/* Administración de roles y permisos */}
            <Route
              path="administracion/roles-permisos"
              element={<RolesPermisosPage />}
            />

          </Route>

          {/* Configuración existente */}
          <Route
            path="administracion/configuracion"
            element={module(
              'Configuración',
              'Vista base para preferencias y parámetros.',
              ['Sección', 'Estado'],
            )}
          />

          {/* Auditoría */}
          <Route
            path="auditoria"
            element={module(
              'Auditoría',
              'Espacio base para trazabilidad.',
              ['Módulo', 'Operaciones', 'Estado'],
            )}
          />

          <Route
            path="auditoria/bitacora"
            element={module(
              'Bitácora',
              'Vista base para operaciones y cambios realizados.',
              ['Usuario', 'Fecha', 'Operación', 'Módulo'],
            )}
          />

        </Route>
      </Route>

      {/* Página no encontrada */}
      <Route
        path="*"
        element={module(
          'Página no encontrada',
          'La página solicitada no existe.',
          ['Estado'],
        )}
      />

    </Routes>
  )
}
