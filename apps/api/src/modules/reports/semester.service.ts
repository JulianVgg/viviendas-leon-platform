import { getPrismaClient } from '../../config/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'
import { harvestUnitKind } from '../agriculture/production.units.js'
import {
  consolidarSemestre, definirPeriodo, paginarPorId, type FiltrosSemestrales, type CosechaFuente,
  type VentaFuente,
} from './semester.rules.js'

const cosechaSelect = {
  id: true, fechaInicioPeriodo: true, fechaFinPeriodo: true, observaciones: true, visitaOrigenId: true,
  cicloCultivo: { select: {
    id: true, cantidadPlantas: true, cultivo: { select: { id: true, nombre: true } },
    huerto: { select: { id: true, nombre: true, familia: { select: {
      id: true, nombreReferencia: true, comunidad: { select: { id: true, nombre: true } },
    } } } },
  } },
  detalles: { select: { id: true, cantidadTotal: true,
    unidadMedida: { select: { codigo: true, nombre: true, abreviatura: true } },
  } },
} satisfies Prisma.RegistroProduccionSelect

const ventaSelect = {
  id: true, fecha: true, cantidadVendida: true, visitaOrigenId: true, observaciones: true,
  unidadMedida: { select: { codigo: true, nombre: true, abreviatura: true } },
  precios: { select: {
    precioUnitario: true, moneda: { select: { codigo: true } },
  } },
  registroProduccion: { select: { id: true, cicloCultivo: { select: {
    id: true, cultivo: { select: { id: true, nombre: true } },
    huerto: { select: { id: true, nombre: true, familia: { select: {
      id: true, nombreReferencia: true, comunidad: { select: { id: true, nombre: true } },
    } } } },
  } } } },
} satisfies Prisma.RegistroVentaSelect

type CosechaDb = Prisma.RegistroProduccionGetPayload<{ select: typeof cosechaSelect }>
type VentaDb = Prisma.RegistroVentaGetPayload<{ select: typeof ventaSelect }>
const fecha = (value: Date) => value.toISOString().slice(0, 10)
const esDatoPrueba = (cultivo: string, familia: string, comunidad: string, unidadCodigo: string) =>
  /^SYN-/i.test(unidadCodigo) || /sint[eé]tic/i.test(`${cultivo} ${familia} ${comunidad}`) ||
  /de prueba/i.test(comunidad)

const convertirCosecha = (item: CosechaDb): CosechaFuente => {
  const ciclo = item.cicloCultivo
  const familia = ciclo.huerto.familia
  return {
    id: item.id, cicloId: ciclo.id, cultivoId: ciclo.cultivo.id, cultivo: ciclo.cultivo.nombre,
    familiaId: familia.id, familia: familia.nombreReferencia, comunidadId: familia.comunidad.id,
    comunidad: familia.comunidad.nombre,
    huertoId: ciclo.huerto.id, huerto: ciclo.huerto.nombre,
    visitaOrigenId: item.visitaOrigenId, cantidadPlantas: ciclo.cantidadPlantas,
    fechaInicio: fecha(item.fechaInicioPeriodo), fechaFin: fecha(item.fechaFinPeriodo),
    observaciones: item.observaciones,
    esDatoPrueba: esDatoPrueba(ciclo.cultivo.nombre, familia.nombreReferencia, familia.comunidad.nombre, ''),
    detalles: item.detalles.map(detalle => ({
      id: detalle.id, cantidad: detalle.cantidadTotal.toString(),
      tipo: /^SYN-/i.test(detalle.unidadMedida.codigo) ? 'otra' : harvestUnitKind(detalle.unidadMedida),
      unidadCodigo: detalle.unidadMedida.codigo,
    })),
  }
}
const convertirVenta = (item: VentaDb): VentaFuente => {
  const cosecha = item.registroProduccion
  const ciclo = cosecha.cicloCultivo
  const familia = ciclo.huerto.familia
  const unico = item.precios.length === 1 ? item.precios[0] : undefined
  return {
    id: item.id, cosechaId: cosecha.id, cicloId: ciclo.id, cultivoId: ciclo.cultivo.id,
    cultivo: ciclo.cultivo.nombre, familiaId: familia.id, familia: familia.nombreReferencia,
    comunidadId: familia.comunidad.id, comunidad: familia.comunidad.nombre,
    huertoId: ciclo.huerto.id, huerto: ciclo.huerto.nombre,
    visitaOrigenId: item.visitaOrigenId, observaciones: item.observaciones,
    fecha: item.fecha ? fecha(item.fecha) : '', cantidad: item.cantidadVendida.toString(),
    tipo: harvestUnitKind(item.unidadMedida), unidadCodigo: item.unidadMedida.codigo,
    precioUnitario: unico?.precioUnitario.toString() ?? null,
    moneda: unico?.moneda.codigo ?? null, cantidadPrecios: item.precios.length,
    esDatoPrueba: esDatoPrueba(ciclo.cultivo.nombre, familia.nombreReferencia,
      familia.comunidad.nombre, item.unidadMedida.codigo),
  }
}

export async function obtenerProduccionSemestral(filtros: FiltrosSemestrales) {
  const periodo = definirPeriodo(filtros)
  const inicio = new Date(`${periodo.desde}T00:00:00.000Z`)
  const fin = new Date(`${periodo.hastaExclusivo}T00:00:00.000Z`)
  const huerto = {
    ...(filtros.familiaId ? { familiaId: filtros.familiaId } : {}),
    ...(filtros.comunidadId ? { familia: { comunidadId: filtros.comunidadId } } : {}),
  }
  // Ambas consultas comparten un snapshot para evitar sumar ventas de una versión
  // distinta de la producción si se registran cosechas mientras corre el informe.
  return getPrismaClient().$transaction(async tx => {
    const cosechas = await paginarPorId(cursor => tx.registroProduccion.findMany({
      where: {
        fechaInicioPeriodo: { lt: fin }, fechaFinPeriodo: { gte: inicio },
        cicloCultivo: { huerto },
      },
      select: cosechaSelect, orderBy: { id: 'asc' }, take: 400,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }))
    const ventas = await paginarPorId(cursor => tx.registroVenta.findMany({
      where: {
        fecha: { gte: inicio, lt: fin },
        registroProduccion: { cicloCultivo: { huerto } },
      },
      select: ventaSelect, orderBy: { id: 'asc' }, take: 400,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }))
    return {
      filtros,
      ...consolidarSemestre(periodo, cosechas.map(convertirCosecha), ventas.map(convertirVenta)),
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 60_000 })
}
