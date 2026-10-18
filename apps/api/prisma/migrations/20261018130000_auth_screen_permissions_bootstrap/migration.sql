-- AUTH-04/05/06: catálogo idempotente de permisos de pantalla.
-- Registra códigos faltantes sin renombrar ni modificar permisos existentes.
-- Solo completa el acceso de Familias para Coordinación y conserva
-- FAMILIAS_WRITE como autorización de escritura del backend.
BEGIN;

INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
  ('PANTALLA_DASHBOARD', 'Dashboard', 'Acceso al panel principal.'),
  ('PANTALLA_MI_PERFIL', 'Mi perfil', 'Acceso al perfil de la cuenta autenticada.'),
  ('PANTALLA_FAMILIAS', 'Listado de familias', 'Consulta del listado de familias.'),
  ('PANTALLA_FAMILIAS_CREAR', 'Registrar familia', 'Acceso a la pantalla de registro integral de familias.'),
  ('PANTALLA_FAMILIAS_DETALLE', 'Detalle de familia', 'Consulta del expediente familiar.'),
  ('PANTALLA_FAMILIAS_EDITAR', 'Editar familias', 'Acceso a las pantallas de edición de familias.'),
  ('PANTALLA_GESTION_AGRICOLA', 'Gestión agrícola', 'Acceso a la vista general de gestión agrícola.'),
  ('PANTALLA_HUERTOS', 'Huertos', 'Acceso a la gestión de huertos.'),
  ('PANTALLA_CULTIVOS', 'Cultivos', 'Acceso a la gestión de cultivos.'),
  ('PANTALLA_PRODUCCION', 'Producción', 'Acceso al seguimiento de producción.'),
  ('PANTALLA_CONTROL_FITOSANITARIO', 'Control fitosanitario', 'Acceso al control fitosanitario.'),
  ('PANTALLA_INSUMOS', 'Insumos', 'Acceso a la gestión de insumos.'),
  ('PANTALLA_VISITAS_AGENDA', 'Agenda de visitas', 'Acceso a la agenda de visitas.'),
  ('PANTALLA_VISITAS_NUEVA', 'Registrar visita', 'Acceso al registro de visitas.'),
  ('PANTALLA_VISITAS_HISTORIAL', 'Historial de visitas', 'Acceso al historial de visitas.'),
  ('PANTALLA_ACTIVIDADES', 'Actividades', 'Acceso a la vista general de actividades.'),
  ('PANTALLA_ASISTENCIA_TECNICA', 'Asistencia técnica', 'Acceso a asistencia técnica.'),
  ('PANTALLA_CAPACITACIONES', 'Capacitaciones', 'Acceso a capacitaciones.'),
  ('PANTALLA_VOLUNTARIADO', 'Voluntariado', 'Acceso a voluntariado.'),
  ('PANTALLA_REPORTES', 'Reportes', 'Acceso a la vista general de reportes.'),
  ('PANTALLA_REPORTES_LISTA', 'Listado de reportes', 'Acceso al listado de reportes.'),
  ('PANTALLA_INDICADORES', 'Indicadores', 'Acceso a indicadores.'),
  ('PANTALLA_ALERTAS', 'Alertas', 'Acceso a alertas.'),
  ('PANTALLA_ADMINISTRACION', 'Administración', 'Acceso a la vista general de administración.'),
  ('PANTALLA_USUARIOS', 'Usuarios', 'Acceso a la administración de usuarios.'),
  ('PANTALLA_ROLES_PERMISOS', 'Roles y permisos', 'Acceso a la administración de roles y permisos.'),
  ('PANTALLA_CONFIGURACION', 'Configuración', 'Acceso a configuración.'),
  ('PANTALLA_AUDITORIA', 'Auditoría', 'Acceso a la vista general de auditoría.'),
  ('PANTALLA_BITACORA', 'Bitácora', 'Acceso a la bitácora.'),
  ('PANTALLA_OFFLINE_TEST', 'Prueba offline', 'Acceso de desarrollo a la prueba offline.'),
  ('PANTALLA_OFFLINE_OPERACIONES', 'Operaciones offline', 'Acceso de desarrollo a operaciones offline.'),
  ('PANTALLA_OFFLINE_COLA', 'Cola offline', 'Acceso de desarrollo a la cola offline.'),
  ('PANTALLA_OFFLINE_CONECTIVIDAD', 'Conectividad offline', 'Acceso de desarrollo a conectividad offline.'),
  ('PANTALLA_OFFLINE_SYNC', 'Sincronización offline', 'Acceso de desarrollo a sincronización offline.'),
  ('FAMILIAS_WRITE', 'Editar familias e integrantes', 'Permite registrar y actualizar familias y administrar sus integrantes.')
ON CONFLICT ("codigo") DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "rol"
    WHERE "nombre" = 'Coordinadora del programa agroforestal'
  ) THEN
    RAISE EXCEPTION 'No existe el rol institucional Coordinadora del programa agroforestal';
  END IF;
END $$;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id"
FROM "rol" r
JOIN "permiso" p ON p."codigo" IN (
  'PANTALLA_FAMILIAS',
  'PANTALLA_FAMILIAS_CREAR',
  'PANTALLA_FAMILIAS_DETALLE',
  'PANTALLA_FAMILIAS_EDITAR',
  'FAMILIAS_WRITE'
)
WHERE r."nombre" = 'Coordinadora del programa agroforestal'
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM "rol" r
    JOIN "rol_permiso" rp ON rp."rol_id" = r."id"
    JOIN "permiso" p ON p."id" = rp."permiso_id"
    WHERE r."nombre" = 'Coordinadora del programa agroforestal'
      AND p."codigo" IN (
        'PANTALLA_FAMILIAS',
        'PANTALLA_FAMILIAS_CREAR',
        'PANTALLA_FAMILIAS_DETALLE',
        'PANTALLA_FAMILIAS_EDITAR',
        'FAMILIAS_WRITE'
      )
  ) <> 5 THEN
    RAISE EXCEPTION 'No se pudieron verificar los permisos de Familias para Coordinación';
  END IF;
END $$;

COMMIT;
