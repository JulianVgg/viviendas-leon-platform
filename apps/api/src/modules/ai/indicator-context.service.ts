import { getPrismaClient } from '../../config/prisma.js'
import type { AuthenticatedUser } from '../auth/auth.service.js'
import { puedeEditarPerfilCompleto } from '../profile/profile.permissions.js'
import { obtenerResumenDashboard } from '../dashboard/dashboard-summary.service.js'
import { obtenerIndicadoresFamiliasProgramas } from '../dashboard/families-programs.service.js'
import { obtenerIndicadoresVisitasCapacitaciones } from '../dashboard/visits-training.service.js'
import { obtenerIndicadoresAgricolas } from '../dashboard/agriculture-production.service.js'
import { obtenerResumenAlertasMon06 } from '../dashboard/mon06-alerts.service.js'
import type { FiltrosMon05 } from '../dashboard/mon05-filters.js'
import { construirContextoIndicadoresIA, validarParametrosContextoIA } from './indicator-context.rules.js'

/**
 * AI-01.1: uso INTERNO del backend. No publica un endpoint ni consume OpenAI.
 * El contexto resultante solo contiene métricas agregadas y referencias no personales.
 * AI-01.2 será responsable de la autorización HTTP y del control de costos de la API externa.
 */
export async function consolidarIndicadoresIA(
  usuario: AuthenticatedUser,
  meses: number,
  filtros: FiltrosMon05 = {},
  db?: ReturnType<typeof getPrismaClient>,
  ahora = new Date(),
) {
  // Autorizar ANTES de adquirir un cliente de base de datos o ejecutar una consulta.
  if (!puedeEditarPerfilCompleto(usuario.roles)) throw new Error('No autorizado para análisis institucional.')
  validarParametrosContextoIA(meses, filtros)
  const client = db ?? getPrismaClient()
  const [resumen, familias, actividad, agricultura, alertas] = await Promise.all([
    obtenerResumenDashboard(usuario, meses, client, filtros, ahora),
    obtenerIndicadoresFamiliasProgramas(client, ahora, filtros),
    obtenerIndicadoresVisitasCapacitaciones(usuario, meses, client, ahora, filtros),
    obtenerIndicadoresAgricolas(meses, client, ahora, filtros),
    obtenerResumenAlertasMon06(usuario, filtros, client, ahora),
  ])
  if (!alertas) throw new Error('No autorizado para consultar alertas institucionales.')
  return construirContextoIndicadoresIA({ resumen, familias, actividad, agricultura, alertas }, {
    meses, comunidadFiltrada: filtros.comunidadId !== undefined,
    responsableFiltrado: filtros.responsableId !== undefined, generadoEn: ahora,
  })
}
