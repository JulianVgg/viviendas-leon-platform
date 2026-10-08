import express from 'express';
import cors from 'cors';
import { familiesRouter } from './modules/families/families.routes.js';
import { communitiesRouter } from './modules/catalogs/catalogs.routes.js';
import type { ErrorRequestHandler } from 'express';

export const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
  }),
);

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'viviendas-leon-api',
  });
});
app.use('/api/v1/familias', familiesRouter);
app.use('/api/v1/comunidades', communitiesRouter);

const handleRequestError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El cuerpo de la solicitud no es válido.', details: [{ field: 'body', message: 'Envía un objeto JSON válido dentro del tamaño permitido.' }] } });
    return;
  }
  console.error('Unexpected request error:', error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'No fue posible completar la solicitud.' } });
};
app.use(handleRequestError);
