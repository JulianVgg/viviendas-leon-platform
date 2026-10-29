
import express from 'express';
import cors from 'cors';
import type { ErrorRequestHandler } from 'express';

// Rutas existentes del proyecto
import { familiesRouter } from './modules/families/families.routes.js';
import { communitiesRouter } from './modules/catalogs/catalogs.routes.js';
import { adminCommunitiesRouter } from './modules/catalogs/communities.routes.js';
import { municipalitiesRouter } from './modules/catalogs/municipalities.routes.js';
import { programsRouter } from './modules/catalogs/programs.routes.js';
import { offlineDemoRouter } from './modules/offline/offline.routes.js';
import { visitsRouter } from './modules/visits/visits.routes.js';
import { gardensRouter } from './modules/agriculture/gardens.routes.js';
import { cropsRouter } from './modules/agriculture/crops.routes.js';
import { cyclesRouter } from './modules/agriculture/cycles.routes.js';
import { calendarRouter } from './modules/calendar/calendar.routes.js';
import { invitationsRouter } from './modules/calendar/invitations.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { pushSubscriptionsRouter } from './modules/notifications/push-subscriptions.routes.js';
import { remindersRouter } from './modules/notifications/reminders.routes.js';
import { miAgendaRouter } from './modules/dashboard/my-agenda.routes.js';
import { dashboardSummaryRouter } from './modules/dashboard/dashboard-summary.routes.js';
import { trainingRouter } from './modules/training/training.routes.js';

// AUTH-04: Administración de usuarios
import { usersRouter } from './modules/users/users.routes.js';

// AUTH-04: Perfil personal
import { profileRouter } from './modules/profile/profile.routes.js';
// Perfil: edición de dirección y fotografía
import { profileExtrasRouter } from './modules/profile/profile-extras.routes.js';

// AUTH-04: Roles y permisos
import { rolesRouter } from './modules/admin/roles.routes.js';

// AUTH-04: Cambio obligatorio de contraseña
import { requirePasswordChangeCompleted } from './modules/auth/require-password-change.middleware.js';

// AUTH-02: Autenticación
import { authRouter } from './modules/auth/auth.routes.js';
import { createSessionMiddleware } from './config/session.js';

export const app = express();

// Configuración CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  }),
);

// Procesar solicitudes JSON
app.use(express.json());

// AUTH-02: Configurar sesiones
app.use(createSessionMiddleware());

// Verificar estado del servidor
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'viviendas-leon-api',
  });
});

// AUTH-02: Rutas de autenticación
app.use('/api/v1/auth', authRouter);

// AUTH-04: Cambio obligatorio de contraseña
// Impide acceder a las demás operaciones hasta
// establecer una contraseña personal.
app.use('/api/v1', requirePasswordChangeCompleted);

// AUTH-04: Perfil del usuario autenticado
app.use('/api/v1/perfil', profileRouter);

// AUTH-06: Dirección y fotografía de perfil
app.use('/api/v1/perfil', profileExtrasRouter);

// AUTH-04: Administración de roles y permisos
app.use('/api/v1/roles', rolesRouter);

// AUTH-04: Administración de usuarios
app.use('/api/v1/usuarios', usersRouter);

// Rutas existentes de Viviendas León
app.use('/api/v1/familias', familiesRouter);
app.use('/api/v1/comunidades', adminCommunitiesRouter);
app.use('/api/v1/comunidades', communitiesRouter);
app.use('/api/v1/municipios', municipalitiesRouter);
app.use('/api/v1/programas', programsRouter);
app.use('/api/v1/offline', offlineDemoRouter);
app.use('/api/v1/visitas', visitsRouter);
app.use('/api/v1/huertos', gardensRouter);
app.use('/api/v1/cultivos', cropsRouter);
app.use('/api/v1/ciclos-cultivo', cyclesRouter);
app.use('/api/v1/calendario', calendarRouter);
app.use('/api/v1/invitaciones', invitationsRouter);
app.use('/api/v1/notificaciones/push', pushSubscriptionsRouter);
app.use('/api/v1/notificaciones', notificationsRouter);
app.use('/api/v1/recordatorios', remindersRouter);
app.use('/api/v1/mi-agenda', miAgendaRouter);
app.use('/api/v1/dashboard/resumen', dashboardSummaryRouter);
app.use('/api/v1/capacitaciones', trainingRouter);

// Manejo global de errores
const handleRequestError: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  if (
    error?.type === 'entity.parse.failed' ||
    error?.type === 'entity.too.large'
  ) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'El cuerpo de la solicitud no es válido.',
        details: [
          {
            field: 'body',
            message:
              'Envía un objeto JSON válido dentro del tamaño permitido.',
          },
        ],
      },
    });
    return;
  }

  console.error('Unexpected request error:', error);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'No fue posible completar la solicitud.',
    },
  });
};

app.use(handleRequestError);
