import express from 'express';
import cors from 'cors';
import { familiesRouter } from './modules/families/families.routes.js';

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
