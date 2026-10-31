import { getPrismaClient } from '../../config/prisma.js'
import { contarVisitasConProduccion, limitesAgricultura, resumirAgricultura } from './agriculture-production.rules.js'

// MON-04: Solo datos persistidos. Las proyecciones de visitas no se mezclan con cosechas efectivas.
export async function obtenerIndicadoresAgricolas(meses: number, db = getPrismaClient(), ahora = new Date()) {
  const { desde, hoy, claves, inicio, fin } = limitesAgricultura(ahora, meses)
  const [ciclos, producciones, capturas] = await Promise.all([
    db.cicloCultivo.findMany({
      select: {id:true, estado:true, cantidadPlantas:true,
        cultivo:{select:{id:true,nombre:true}},
        huerto:{select:{familia:{select:{id:true,comunidad:{select:{nombre:true}}}}}}},
    }),
    db.registroProduccion.findMany({
      where:{fechaFinPeriodo:{gte:inicio,lte:fin}},
      select:{id:true,fechaFinPeriodo:true,
        cicloCultivo:{select:{cultivo:{select:{id:true,nombre:true}}}},
        detalles:{select:{cantidadTotal:true,unidadMedida:{select:{codigo:true,abreviatura:true}}}}},
    }),
    db.visitaCaptura.findMany({
      where:{visita:{estado:'REALIZADA',fecha:{gte:inicio,lte:fin}}},
      select:{datos:true},
    }),
  ])
  return {
    alcance:'INSTITUCIONAL' as const,
    periodo:{meses,desde,hasta:hoy},
    ...resumirAgricultura(ciclos,producciones,claves),
    visitasConProduccion:contarVisitasConProduccion(capturas),
  }
}
