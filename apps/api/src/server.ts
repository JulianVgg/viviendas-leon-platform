import 'dotenv/config';
import { app } from './app.js';
import { iniciarProcesadorRecordatorios } from './modules/notifications/reminders.worker.js';
import { iniciarProcesadorAvisosSeguimiento } from './modules/notifications/followup-alerts.worker.js';

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`API ejecutándose en http://localhost:${PORT}`);
  iniciarProcesadorRecordatorios();
  iniciarProcesadorAvisosSeguimiento();
});