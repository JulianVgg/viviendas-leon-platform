
import express from 'express';
import cors from 'cors';
import type { ErrorRequestHandler } from 'express';

// Rutas existentes del proyecto
import { familiesRouter } from './modules/families/families.routes.js';
import { communitiesRouter } from './modules/catalogs/catalogs.routes.js';
import { offlineDemoRouter } from './modules/offline/offline.routes.js';
import { visitsRouter } from './modules/visits/visits.routes.js';

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

// AUTH-02: Rutas de inicio y cierre de sesión
app.use('/api/v1/auth', authRouter);

// Rutas existentes de Viviendas León
app.use('/api/v1/familias', familiesRouter);
app.use('/api/v1/comunidades', communitiesRouter);
app.use('/api/v1/offline', offlineDemoRouter);
app.use('/api/v1/visitas', visitsRouter);

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
