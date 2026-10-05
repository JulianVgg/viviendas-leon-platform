import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the synthetic seed.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const moment = (value: string) => new Date(`${value}T12:00:00.000Z`);

type Delegate = {
  findFirst(args: { where: Record<string, unknown> }): Promise<{ id: number } | null>;
  create(args: { data: Record<string, unknown> }): Promise<{ id: number }>;
  update(args: { where: { id: number }; data: Record<string, unknown> }): Promise<{ id: number }>;
};

async function ensure(
  delegate: Delegate,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
) {
  const existing = await delegate.findFirst({ where });
  return existing
    ? delegate.update({ where: { id: existing.id }, data })
    : delegate.create({ data });
}

async function main() {
  const municipioNorte = await ensure(
    prisma.municipio,
    { nombre: "Municipio Sintético Norte" },
    { nombre: "Municipio Sintético Norte", activo: true },
  );
  const municipioSur = await ensure(
    prisma.municipio,
    { nombre: "Municipio Sintético Sur" },
    { nombre: "Municipio Sintético Sur", activo: true },
  );

  const comunidadLoma = await ensure(
    prisma.comunidad,
    { municipioId: municipioNorte.id, nombre: "Comunidad Loma de Prueba" },
    { municipioId: municipioNorte.id, nombre: "Comunidad Loma de Prueba", activo: true },
  );
  const comunidadValle = await ensure(
    prisma.comunidad,
    { municipioId: municipioNorte.id, nombre: "Comunidad Valle de Prueba" },
    { municipioId: municipioNorte.id, nombre: "Comunidad Valle de Prueba", activo: true },
  );
  const comunidadBosque = await ensure(
    prisma.comunidad,
    { municipioId: municipioSur.id, nombre: "Comunidad Bosque de Prueba" },
    { municipioId: municipioSur.id, nombre: "Comunidad Bosque de Prueba", activo: true },
  );

  const familiaLoma = await ensure(
    prisma.familia,
    { comunidadId: comunidadLoma.id, nombreReferencia: "Familia Sintética Loma 01" },
    {
      comunidadId: comunidadLoma.id,
      nombreReferencia: "Familia Sintética Loma 01",
      fechaIngreso: day("2026-01-10"),
      estado: "ACTIVA",
      observaciones: "Registro ficticio para pruebas del flujo agrícola.",
    },
  );
  const familiaValle = await ensure(
    prisma.familia,
    { comunidadId: comunidadValle.id, nombreReferencia: "Familia Sintética Valle 01" },
    {
      comunidadId: comunidadValle.id,
      nombreReferencia: "Familia Sintética Valle 01",
      fechaIngreso: day("2026-01-15"),
      estado: "ACTIVA",
      observaciones: "Registro ficticio para pruebas de visitas y capacitaciones.",
    },
  );
  const familiaBosque = await ensure(
    prisma.familia,
    { comunidadId: comunidadBosque.id, nombreReferencia: "Familia Sintética Bosque 01" },
    {
      comunidadId: comunidadBosque.id,
      nombreReferencia: "Familia Sintética Bosque 01",
      fechaIngreso: day("2026-02-01"),
      estado: "ACTIVA",
      observaciones: "Registro ficticio para pruebas de entrega de insumos.",
    },
  );

  const integranteLoma = await ensure(
    prisma.integranteFamilia,
    { familiaId: familiaLoma.id, nombreCompleto: "Persona Sintética Loma A" },
    {
      familiaId: familiaLoma.id,
      nombreCompleto: "Persona Sintética Loma A",
      fechaNacimiento: day("1988-03-12"),
      sexo: "F",
      parentesco: "Titular de prueba",
      telefono: "000-000-0001",
      activo: true,
    },
  );
  await ensure(
    prisma.integranteFamilia,
    { familiaId: familiaLoma.id, nombreCompleto: "Persona Sintética Loma B" },
    {
      familiaId: familiaLoma.id,
      nombreCompleto: "Persona Sintética Loma B",
      fechaNacimiento: day("1990-07-21"),
      sexo: "M",
      parentesco: "Integrante de prueba",
      telefono: "000-000-0002",
      activo: true,
    },
  );
  const integranteValle = await ensure(
    prisma.integranteFamilia,
    { familiaId: familiaValle.id, nombreCompleto: "Persona Sintética Valle A" },
    {
      familiaId: familiaValle.id,
      nombreCompleto: "Persona Sintética Valle A",
      fechaNacimiento: day("1979-11-05"),
      sexo: "F",
      parentesco: "Titular de prueba",
      telefono: "000-000-0003",
      activo: true,
    },
  );
  await ensure(
    prisma.integranteFamilia,
    { familiaId: familiaBosque.id, nombreCompleto: "Persona Sintética Bosque A" },
    {
      familiaId: familiaBosque.id,
      nombreCompleto: "Persona Sintética Bosque A",
      fechaNacimiento: day("1995-02-18"),
      sexo: "M",
      parentesco: "Titular de prueba",
      telefono: "000-000-0004",
      activo: true,
    },
  );

  const programaHuertos = await ensure(
    prisma.programa,
    { nombre: "Programa Sintético Huertos" },
    {
      nombre: "Programa Sintético Huertos",
      descripcion: "Programa ficticio para pruebas de participación familiar.",
      fechaInicio: day("2026-01-01"),
      estado: "ACTIVO",
    },
  );
  const programaCapacitacion = await ensure(
    prisma.programa,
    { nombre: "Programa Sintético Capacitación" },
    {
      nombre: "Programa Sintético Capacitación",
      descripcion: "Programa ficticio para pruebas de capacitación.",
      fechaInicio: day("2026-02-01"),
      estado: "ACTIVO",
    },
  );

  await prisma.familiaPrograma.upsert({
    where: { familiaId_programaId: { familiaId: familiaLoma.id, programaId: programaHuertos.id } },
    update: { estado: "ACTIVO", fechaIngreso: day("2026-01-10") },
    create: { familiaId: familiaLoma.id, programaId: programaHuertos.id, estado: "ACTIVO", fechaIngreso: day("2026-01-10") },
  });
  await prisma.familiaPrograma.upsert({
    where: { familiaId_programaId: { familiaId: familiaValle.id, programaId: programaHuertos.id } },
    update: { estado: "ACTIVO", fechaIngreso: day("2026-01-15") },
    create: { familiaId: familiaValle.id, programaId: programaHuertos.id, estado: "ACTIVO", fechaIngreso: day("2026-01-15") },
  });
  await prisma.familiaPrograma.upsert({
    where: { familiaId_programaId: { familiaId: familiaValle.id, programaId: programaCapacitacion.id } },
    update: { estado: "ACTIVO", fechaIngreso: day("2026-02-01") },
    create: { familiaId: familiaValle.id, programaId: programaCapacitacion.id, estado: "ACTIVO", fechaIngreso: day("2026-02-01") },
  });

  const cultivoTomate = await ensure(
    prisma.cultivo,
    { nombre: "Cultivo Sintético Tomate" },
    { nombre: "Cultivo Sintético Tomate", descripcion: "Cultivo ficticio de prueba.", activo: true },
  );
  const cultivoFrijol = await ensure(
    prisma.cultivo,
    { nombre: "Cultivo Sintético Frijol" },
    { nombre: "Cultivo Sintético Frijol", descripcion: "Cultivo ficticio de prueba.", activo: true },
  );
  const cultivoLechuga = await ensure(
    prisma.cultivo,
    { nombre: "Cultivo Sintético Lechuga" },
    { nombre: "Cultivo Sintético Lechuga", descripcion: "Cultivo ficticio de prueba.", activo: true },
  );
  const etapaSiembra = await ensure(
    prisma.etapaCultivo,
    { nombre: "Etapa Sintética Siembra" },
    { nombre: "Etapa Sintética Siembra", descripcion: "Etapa ficticia de prueba.", activo: true },
  );
  const etapaCrecimiento = await ensure(
    prisma.etapaCultivo,
    { nombre: "Etapa Sintética Crecimiento" },
    { nombre: "Etapa Sintética Crecimiento", descripcion: "Etapa ficticia de prueba.", activo: true },
  );
  const etapaCosecha = await ensure(
    prisma.etapaCultivo,
    { nombre: "Etapa Sintética Cosecha" },
    { nombre: "Etapa Sintética Cosecha", descripcion: "Etapa ficticia de prueba.", activo: true },
  );

  const huertoLoma = await ensure(
    prisma.huerto,
    { familiaId: familiaLoma.id, nombre: "Huerto Sintético Loma Principal" },
    { familiaId: familiaLoma.id, nombre: "Huerto Sintético Loma Principal", tipo: "FAMILIAR", fechaInicio: day("2026-01-20"), estado: "ACTIVO" },
  );
  const huertoValle = await ensure(
    prisma.huerto,
    { familiaId: familiaValle.id, nombre: "Huerto Sintético Valle Principal" },
    { familiaId: familiaValle.id, nombre: "Huerto Sintético Valle Principal", tipo: "FAMILIAR", fechaInicio: day("2026-02-05"), estado: "ACTIVO" },
  );
  const huertoBosque = await ensure(
    prisma.huerto,
    { familiaId: familiaBosque.id, nombre: "Huerto Sintético Bosque Principal" },
    { familiaId: familiaBosque.id, nombre: "Huerto Sintético Bosque Principal", tipo: "FAMILIAR", fechaInicio: day("2026-02-10"), estado: "ACTIVO" },
  );
  const cicloTomate = await ensure(
    prisma.cicloCultivo,
    { huertoId: huertoLoma.id, cultivoId: cultivoTomate.id, fechaSiembra: day("2026-01-25") },
    { huertoId: huertoLoma.id, cultivoId: cultivoTomate.id, fechaSiembra: day("2026-01-25"), fechaTrasplante: day("2026-02-05"), cantidadPlantas: 80, estado: "ACTIVO" },
  );
  const cicloFrijol = await ensure(
    prisma.cicloCultivo,
    { huertoId: huertoValle.id, cultivoId: cultivoFrijol.id, fechaSiembra: day("2026-02-10") },
    { huertoId: huertoValle.id, cultivoId: cultivoFrijol.id, fechaSiembra: day("2026-02-10"), cantidadPlantas: 120, estado: "ACTIVO" },
  );
  const cicloLechuga = await ensure(
    prisma.cicloCultivo,
    { huertoId: huertoBosque.id, cultivoId: cultivoLechuga.id, fechaSiembra: day("2026-02-15") },
    { huertoId: huertoBosque.id, cultivoId: cultivoLechuga.id, fechaSiembra: day("2026-02-15"), cantidadPlantas: 60, estado: "ACTIVO" },
  );

  const unidadKg = await ensure(prisma.unidadMedida, { codigo: "SYN-KG" }, { codigo: "SYN-KG", nombre: "Kilogramo sintético", abreviatura: "kg", activo: true });
  const unidadUnidad = await ensure(prisma.unidadMedida, { codigo: "SYN-UND" }, { codigo: "SYN-UND", nombre: "Unidad sintética", abreviatura: "u", activo: true });
  const unidadLitro = await ensure(prisma.unidadMedida, { codigo: "SYN-L" }, { codigo: "SYN-L", nombre: "Litro sintético", abreviatura: "l", activo: true });
  const monedaLocal = await ensure(prisma.moneda, { codigo: "SYN" }, { codigo: "SYN", nombre: "Moneda sintética", simbolo: "¤", activo: true });
  const monedaAlterna = await ensure(prisma.moneda, { codigo: "SYN2" }, { codigo: "SYN2", nombre: "Moneda sintética alternativa", simbolo: "§", activo: true });

  const produccionTomate = await ensure(
    prisma.registroProduccion,
    { cicloCultivoId: cicloTomate.id, fechaInicioPeriodo: day("2026-03-01"), fechaFinPeriodo: day("2026-03-31") },
    { cicloCultivoId: cicloTomate.id, fechaInicioPeriodo: day("2026-03-01"), fechaFinPeriodo: day("2026-03-31"), observaciones: "Producción sintética mensual." },
  );
  const produccionFrijol = await ensure(
    prisma.registroProduccion,
    { cicloCultivoId: cicloFrijol.id, fechaInicioPeriodo: day("2026-03-01"), fechaFinPeriodo: day("2026-03-31") },
    { cicloCultivoId: cicloFrijol.id, fechaInicioPeriodo: day("2026-03-01"), fechaFinPeriodo: day("2026-03-31"), observaciones: "Producción sintética mensual." },
  );
  await ensure(prisma.detalleProduccion, { registroProduccionId: produccionTomate.id, unidadMedidaId: unidadKg.id }, { registroProduccionId: produccionTomate.id, unidadMedidaId: unidadKg.id, cantidadTotal: 145 });
  await ensure(prisma.detalleProduccion, { registroProduccionId: produccionFrijol.id, unidadMedidaId: unidadKg.id }, { registroProduccionId: produccionFrijol.id, unidadMedidaId: unidadKg.id, cantidadTotal: 92 });
  const ventaTomate = await ensure(prisma.registroVenta, { registroProduccionId: produccionTomate.id, fecha: day("2026-03-28"), cantidadVendida: 60 }, { registroProduccionId: produccionTomate.id, fecha: day("2026-03-28"), cantidadVendida: 60, unidadMedidaId: unidadKg.id, observaciones: "Venta sintética de prueba." });
  const ventaFrijol = await ensure(prisma.registroVenta, { registroProduccionId: produccionFrijol.id, fecha: day("2026-03-29"), cantidadVendida: 35 }, { registroProduccionId: produccionFrijol.id, fecha: day("2026-03-29"), cantidadVendida: 35, unidadMedidaId: unidadKg.id, observaciones: "Venta sintética de prueba." });
  await ensure(prisma.precioVenta, { registroVentaId: ventaTomate.id, monedaId: monedaLocal.id }, { registroVentaId: ventaTomate.id, monedaId: monedaLocal.id, precioUnitario: 18.5 });
  await ensure(prisma.precioVenta, { registroVentaId: ventaTomate.id, monedaId: monedaAlterna.id }, { registroVentaId: ventaTomate.id, monedaId: monedaAlterna.id, precioUnitario: 3.2 });
  await ensure(prisma.precioVenta, { registroVentaId: ventaFrijol.id, monedaId: monedaLocal.id }, { registroVentaId: ventaFrijol.id, monedaId: monedaLocal.id, precioUnitario: 22 });

  const usuarioTecnico = await ensure(prisma.usuario, { correo: "tecnico.sintetico@pruebas.invalid" }, { nombre: "Usuario Técnico Sintético", correo: "tecnico.sintetico@pruebas.invalid", passwordHash: "synthetic-hash-technician", estado: "ACTIVO", fechaCreacion: moment("2026-01-01") });
  const usuarioCoordinador = await ensure(prisma.usuario, { correo: "coordinador.sintetico@pruebas.invalid" }, { nombre: "Usuario Coordinador Sintético", correo: "coordinador.sintetico@pruebas.invalid", passwordHash: "synthetic-hash-coordinator", estado: "ACTIVO", fechaCreacion: moment("2026-01-01") });
  const usuarioAuditor = await ensure(prisma.usuario, { correo: "auditor.sintetico@pruebas.invalid" }, { nombre: "Usuario Auditor Sintético", correo: "auditor.sintetico@pruebas.invalid", passwordHash: "synthetic-hash-auditor", estado: "ACTIVO", fechaCreacion: moment("2026-01-01") });
  const rolTecnico = await ensure(prisma.rol, { nombre: "Rol Sintético Técnico" }, { nombre: "Rol Sintético Técnico", descripcion: "Rol ficticio para pruebas técnicas.", activo: true });
  const rolCoordinador = await ensure(prisma.rol, { nombre: "Rol Sintético Coordinador" }, { nombre: "Rol Sintético Coordinador", descripcion: "Rol ficticio para pruebas de coordinación.", activo: true });
  const rolAuditor = await ensure(prisma.rol, { nombre: "Rol Sintético Auditor" }, { nombre: "Rol Sintético Auditor", descripcion: "Rol ficticio para pruebas de auditoría.", activo: true });
  const permisoFamilias = await ensure(prisma.permiso, { codigo: "SYN-FAMILIAS-READ" }, { codigo: "SYN-FAMILIAS-READ", nombre: "Consultar familias sintéticas", descripcion: "Permiso ficticio." });
  const permisoAgricultura = await ensure(prisma.permiso, { codigo: "SYN-AGRICULTURA-WRITE" }, { codigo: "SYN-AGRICULTURA-WRITE", nombre: "Gestionar agricultura sintética", descripcion: "Permiso ficticio." });
  const permisoVisitas = await ensure(prisma.permiso, { codigo: "SYN-VISITAS-WRITE" }, { codigo: "SYN-VISITAS-WRITE", nombre: "Gestionar visitas sintéticas", descripcion: "Permiso ficticio." });
  const permisoReportes = await ensure(prisma.permiso, { codigo: "SYN-REPORTES-READ" }, { codigo: "SYN-REPORTES-READ", nombre: "Consultar reportes sintéticos", descripcion: "Permiso ficticio." });
  await prisma.usuarioRol.upsert({ where: { usuarioId_rolId: { usuarioId: usuarioTecnico.id, rolId: rolTecnico.id } }, update: {}, create: { usuarioId: usuarioTecnico.id, rolId: rolTecnico.id } });
  await prisma.usuarioRol.upsert({ where: { usuarioId_rolId: { usuarioId: usuarioCoordinador.id, rolId: rolCoordinador.id } }, update: {}, create: { usuarioId: usuarioCoordinador.id, rolId: rolCoordinador.id } });
  await prisma.usuarioRol.upsert({ where: { usuarioId_rolId: { usuarioId: usuarioAuditor.id, rolId: rolAuditor.id } }, update: {}, create: { usuarioId: usuarioAuditor.id, rolId: rolAuditor.id } });
  await prisma.rolPermiso.upsert({ where: { rolId_permisoId: { rolId: rolTecnico.id, permisoId: permisoAgricultura.id } }, update: {}, create: { rolId: rolTecnico.id, permisoId: permisoAgricultura.id } });
  await prisma.rolPermiso.upsert({ where: { rolId_permisoId: { rolId: rolTecnico.id, permisoId: permisoVisitas.id } }, update: {}, create: { rolId: rolTecnico.id, permisoId: permisoVisitas.id } });
  await prisma.rolPermiso.upsert({ where: { rolId_permisoId: { rolId: rolCoordinador.id, permisoId: permisoFamilias.id } }, update: {}, create: { rolId: rolCoordinador.id, permisoId: permisoFamilias.id } });
  await prisma.rolPermiso.upsert({ where: { rolId_permisoId: { rolId: rolAuditor.id, permisoId: permisoReportes.id } }, update: {}, create: { rolId: rolAuditor.id, permisoId: permisoReportes.id } });

  const climaSoleado = await ensure(prisma.condicionClimatica, { nombre: "Clima Sintético Soleado" }, { nombre: "Clima Sintético Soleado", activo: true });
  const climaNublado = await ensure(prisma.condicionClimatica, { nombre: "Clima Sintético Nublado" }, { nombre: "Clima Sintético Nublado", activo: true });
  const calidadBuena = await ensure(prisma.calidad, { nombre: "Calidad Sintética Buena" }, { nombre: "Calidad Sintética Buena", activo: true });
  const calidadRegular = await ensure(prisma.calidad, { nombre: "Calidad Sintética Regular" }, { nombre: "Calidad Sintética Regular", activo: true });
  const visitaLoma = await ensure(prisma.visita, { familiaId: familiaLoma.id, usuarioResponsableId: usuarioTecnico.id, fecha: day("2026-03-10"), tipo: "SEGUIMIENTO" }, { familiaId: familiaLoma.id, usuarioResponsableId: usuarioTecnico.id, condicionClimaticaId: climaSoleado.id, fecha: day("2026-03-10"), tipo: "SEGUIMIENTO", estado: "REALIZADA", observaciones: "Visita sintética de seguimiento." });
  const visitaValle = await ensure(prisma.visita, { familiaId: familiaValle.id, usuarioResponsableId: usuarioTecnico.id, fecha: day("2026-03-12"), tipo: "DIAGNOSTICO" }, { familiaId: familiaValle.id, usuarioResponsableId: usuarioTecnico.id, condicionClimaticaId: climaNublado.id, fecha: day("2026-03-12"), tipo: "DIAGNOSTICO", estado: "REALIZADA", observaciones: "Visita sintética de diagnóstico." });
  const visitaBosque = await ensure(prisma.visita, { familiaId: familiaBosque.id, usuarioResponsableId: usuarioCoordinador.id, fecha: day("2026-03-14"), tipo: "SEGUIMIENTO" }, { familiaId: familiaBosque.id, usuarioResponsableId: usuarioCoordinador.id, condicionClimaticaId: climaSoleado.id, fecha: day("2026-03-14"), tipo: "SEGUIMIENTO", estado: "PROGRAMADA", observaciones: "Visita sintética programada." });
  const evaluacionLoma = await ensure(prisma.evaluacionCultivo, { visitaId: visitaLoma.id, cicloCultivoId: cicloTomate.id }, { visitaId: visitaLoma.id, cicloCultivoId: cicloTomate.id, etapaCultivoId: etapaCrecimiento.id, calidadId: calidadBuena.id, observaciones: "Evaluación sintética favorable." });
  const evaluacionValle = await ensure(prisma.evaluacionCultivo, { visitaId: visitaValle.id, cicloCultivoId: cicloFrijol.id }, { visitaId: visitaValle.id, cicloCultivoId: cicloFrijol.id, etapaCultivoId: etapaSiembra.id, calidadId: calidadRegular.id, observaciones: "Evaluación sintética con seguimiento requerido." });
  const evaluacionBosque = await ensure(prisma.evaluacionCultivo, { visitaId: visitaBosque.id, cicloCultivoId: cicloLechuga.id }, { visitaId: visitaBosque.id, cicloCultivoId: cicloLechuga.id, etapaCultivoId: etapaCosecha.id, calidadId: calidadBuena.id, observaciones: "Evaluación sintética de cosecha." });

  const enfermedadA = await ensure(prisma.enfermedad, { nombre: "Enfermedad Sintética A" }, { nombre: "Enfermedad Sintética A", descripcion: "Catálogo ficticio.", activo: true });
  const enfermedadB = await ensure(prisma.enfermedad, { nombre: "Enfermedad Sintética B" }, { nombre: "Enfermedad Sintética B", descripcion: "Catálogo ficticio.", activo: true });
  const plagaA = await ensure(prisma.plaga, { nombre: "Plaga Sintética A" }, { nombre: "Plaga Sintética A", descripcion: "Catálogo ficticio.", activo: true });
  const plagaB = await ensure(prisma.plaga, { nombre: "Plaga Sintética B" }, { nombre: "Plaga Sintética B", descripcion: "Catálogo ficticio.", activo: true });
  await prisma.evaluacionEnfermedad.upsert({ where: { evaluacionCultivoId_enfermedadId: { evaluacionCultivoId: evaluacionLoma.id, enfermedadId: enfermedadA.id } }, update: { porcentajeDanio: 12.5 }, create: { evaluacionCultivoId: evaluacionLoma.id, enfermedadId: enfermedadA.id, porcentajeDanio: 12.5 } });
  await prisma.evaluacionEnfermedad.upsert({ where: { evaluacionCultivoId_enfermedadId: { evaluacionCultivoId: evaluacionValle.id, enfermedadId: enfermedadB.id } }, update: { porcentajeDanio: 28 }, create: { evaluacionCultivoId: evaluacionValle.id, enfermedadId: enfermedadB.id, porcentajeDanio: 28 } });
  await prisma.evaluacionPlaga.upsert({ where: { evaluacionCultivoId_plagaId: { evaluacionCultivoId: evaluacionLoma.id, plagaId: plagaA.id } }, update: { porcentajeDanio: 8 }, create: { evaluacionCultivoId: evaluacionLoma.id, plagaId: plagaA.id, porcentajeDanio: 8 } });
  await prisma.evaluacionPlaga.upsert({ where: { evaluacionCultivoId_plagaId: { evaluacionCultivoId: evaluacionBosque.id, plagaId: plagaB.id } }, update: { porcentajeDanio: 5 }, create: { evaluacionCultivoId: evaluacionBosque.id, plagaId: plagaB.id, porcentajeDanio: 5 } });

  const categoriaOrganico = await ensure(prisma.categoriaInsumo, { nombre: "Categoría Sintética Orgánico" }, { nombre: "Categoría Sintética Orgánico", descripcion: "Categoría ficticia.", activo: true });
  const categoriaHerramienta = await ensure(prisma.categoriaInsumo, { nombre: "Categoría Sintética Herramienta" }, { nombre: "Categoría Sintética Herramienta", descripcion: "Categoría ficticia.", activo: true });
  const insumoCompost = await ensure(prisma.insumo, { categoriaInsumoId: categoriaOrganico.id, nombre: "Insumo Sintético Compost" }, { categoriaInsumoId: categoriaOrganico.id, nombre: "Insumo Sintético Compost", descripcion: "Insumo ficticio.", activo: true });
  const insumoBio = await ensure(prisma.insumo, { categoriaInsumoId: categoriaOrganico.id, nombre: "Insumo Sintético BioControl" }, { categoriaInsumoId: categoriaOrganico.id, nombre: "Insumo Sintético BioControl", descripcion: "Insumo ficticio.", activo: true });
  const insumoHerramienta = await ensure(prisma.insumo, { categoriaInsumoId: categoriaHerramienta.id, nombre: "Insumo Sintético Herramienta" }, { categoriaInsumoId: categoriaHerramienta.id, nombre: "Insumo Sintético Herramienta", descripcion: "Insumo ficticio.", activo: true });
  await ensure(prisma.tratamientoAplicado, { evaluacionCultivoId: evaluacionLoma.id, insumoId: insumoBio.id, fechaAplicacion: day("2026-03-11") }, { evaluacionCultivoId: evaluacionLoma.id, insumoId: insumoBio.id, unidadMedidaId: unidadLitro.id, fechaAplicacion: day("2026-03-11"), cantidad: 4.5, observaciones: "Tratamiento sintético preventivo." });
  await ensure(prisma.tratamientoAplicado, { evaluacionCultivoId: evaluacionValle.id, insumoId: insumoCompost.id, fechaAplicacion: day("2026-03-13") }, { evaluacionCultivoId: evaluacionValle.id, insumoId: insumoCompost.id, unidadMedidaId: unidadKg.id, fechaAplicacion: day("2026-03-13"), cantidad: 18, observaciones: "Tratamiento sintético de suelo." });
  const entregaLoma = await ensure(prisma.entregaInsumo, { familiaId: familiaLoma.id, usuarioResponsableId: usuarioCoordinador.id, fecha: day("2026-02-20") }, { familiaId: familiaLoma.id, usuarioResponsableId: usuarioCoordinador.id, fecha: day("2026-02-20"), estado: "ENTREGADA", observaciones: "Entrega sintética de prueba." });
  const entregaValle = await ensure(prisma.entregaInsumo, { familiaId: familiaValle.id, usuarioResponsableId: usuarioCoordinador.id, fecha: day("2026-02-21") }, { familiaId: familiaValle.id, usuarioResponsableId: usuarioCoordinador.id, fecha: day("2026-02-21"), estado: "ENTREGADA", observaciones: "Entrega sintética de prueba." });
  await ensure(prisma.detalleEntregaInsumo, { entregaInsumoId: entregaLoma.id, insumoId: insumoCompost.id, unidadMedidaId: unidadKg.id }, { entregaInsumoId: entregaLoma.id, insumoId: insumoCompost.id, unidadMedidaId: unidadKg.id, cantidad: 25 });
  await ensure(prisma.detalleEntregaInsumo, { entregaInsumoId: entregaLoma.id, insumoId: insumoHerramienta.id, unidadMedidaId: unidadUnidad.id }, { entregaInsumoId: entregaLoma.id, insumoId: insumoHerramienta.id, unidadMedidaId: unidadUnidad.id, cantidad: 2 });
  await ensure(prisma.detalleEntregaInsumo, { entregaInsumoId: entregaValle.id, insumoId: insumoBio.id, unidadMedidaId: unidadLitro.id }, { entregaInsumoId: entregaValle.id, insumoId: insumoBio.id, unidadMedidaId: unidadLitro.id, cantidad: 6 });

  const seguimientoLoma = await ensure(prisma.seguimientoTecnico, { evaluacionCultivoId: evaluacionLoma.id, usuarioResponsableId: usuarioTecnico.id, recomendacion: "Aplicar riego sintético controlado" }, { evaluacionCultivoId: evaluacionLoma.id, usuarioResponsableId: usuarioTecnico.id, recomendacion: "Aplicar riego sintético controlado", fechaProgramada: day("2026-03-20"), fechaRealizada: day("2026-03-21"), estado: "COMPLETADO", resultado: "Seguimiento sintético realizado." });
  const seguimientoValle = await ensure(prisma.seguimientoTecnico, { evaluacionCultivoId: evaluacionValle.id, usuarioResponsableId: usuarioTecnico.id, recomendacion: "Revisar drenaje sintético" }, { evaluacionCultivoId: evaluacionValle.id, usuarioResponsableId: usuarioTecnico.id, recomendacion: "Revisar drenaje sintético", fechaProgramada: day("2026-03-22"), estado: "PENDIENTE" });

  const capacitacionSuelo = await ensure(prisma.capacitacion, { comunidadId: comunidadLoma.id, tema: "Capacitación Sintética de Suelo", fecha: day("2026-03-18") }, { comunidadId: comunidadLoma.id, tema: "Capacitación Sintética de Suelo", descripcion: "Actividad ficticia para pruebas.", fecha: day("2026-03-18"), facilitadorNombre: "Facilitador Sintético A", estado: "REALIZADA" });
  const capacitacionRiego = await ensure(prisma.capacitacion, { comunidadId: comunidadValle.id, tema: "Capacitación Sintética de Riego", fecha: day("2026-03-19") }, { comunidadId: comunidadValle.id, tema: "Capacitación Sintética de Riego", descripcion: "Actividad ficticia para pruebas.", fecha: day("2026-03-19"), facilitadorNombre: "Facilitador Sintético B", estado: "PROGRAMADA" });
  await prisma.participacionCapacitacion.upsert({ where: { capacitacionId_integranteFamiliaId: { capacitacionId: capacitacionSuelo.id, integranteFamiliaId: integranteLoma.id } }, update: { asistio: true }, create: { capacitacionId: capacitacionSuelo.id, integranteFamiliaId: integranteLoma.id, asistio: true } });
  await prisma.participacionCapacitacion.upsert({ where: { capacitacionId_integranteFamiliaId: { capacitacionId: capacitacionRiego.id, integranteFamiliaId: integranteValle.id } }, update: { asistio: false }, create: { capacitacionId: capacitacionRiego.id, integranteFamiliaId: integranteValle.id, asistio: false } });

  const evidenciaFoto = await ensure(prisma.evidencia, { nombreArchivo: "evidencia-sintetica-foto-01.jpg", rutaArchivo: "/synthetic/evidencia-sintetica-foto-01.jpg" }, { nombreArchivo: "evidencia-sintetica-foto-01.jpg", rutaArchivo: "/synthetic/evidencia-sintetica-foto-01.jpg", tipoArchivo: "image/jpeg", descripcion: "Archivo ficticio no real.", fechaRegistro: moment("2026-03-10") });
  const evidenciaDocumento = await ensure(prisma.evidencia, { nombreArchivo: "evidencia-sintetica-documento-01.pdf", rutaArchivo: "/synthetic/evidencia-sintetica-documento-01.pdf" }, { nombreArchivo: "evidencia-sintetica-documento-01.pdf", rutaArchivo: "/synthetic/evidencia-sintetica-documento-01.pdf", tipoArchivo: "application/pdf", descripcion: "Documento ficticio no real.", fechaRegistro: moment("2026-03-18") });
  await prisma.visitaEvidencia.upsert({ where: { visitaId_evidenciaId: { visitaId: visitaLoma.id, evidenciaId: evidenciaFoto.id } }, update: {}, create: { visitaId: visitaLoma.id, evidenciaId: evidenciaFoto.id } });
  await prisma.evaluacionEvidencia.upsert({ where: { evaluacionCultivoId_evidenciaId: { evaluacionCultivoId: evaluacionLoma.id, evidenciaId: evidenciaFoto.id } }, update: {}, create: { evaluacionCultivoId: evaluacionLoma.id, evidenciaId: evidenciaFoto.id } });
  await prisma.capacitacionEvidencia.upsert({ where: { capacitacionId_evidenciaId: { capacitacionId: capacitacionSuelo.id, evidenciaId: evidenciaDocumento.id } }, update: {}, create: { capacitacionId: capacitacionSuelo.id, evidenciaId: evidenciaDocumento.id } });

  await ensure(prisma.alerta, { familiaId: familiaLoma.id, tipo: "RIEGO_SINTETICO", fechaGeneracion: moment("2026-03-15") }, { familiaId: familiaLoma.id, visitaId: visitaLoma.id, seguimientoTecnicoId: seguimientoValle.id, tipo: "RIEGO_SINTETICO", descripcion: "Alerta ficticia de seguimiento de riego.", fechaGeneracion: moment("2026-03-15"), fechaVencimiento: moment("2026-03-25"), estado: "PENDIENTE" });
  await ensure(prisma.alerta, { familiaId: familiaValle.id, tipo: "VISITA_SINTETICA", fechaGeneracion: moment("2026-03-16") }, { familiaId: familiaValle.id, visitaId: visitaValle.id, tipo: "VISITA_SINTETICA", descripcion: "Alerta ficticia de visita.", fechaGeneracion: moment("2026-03-16"), estado: "RESUELTA", fechaResolucion: moment("2026-03-17") });

  await ensure(prisma.bitacora, { usuarioId: usuarioAuditor.id, entidad: "familia", registroId: String(familiaLoma.id), accion: "CREATE", fecha: moment("2026-03-01") }, { usuarioId: usuarioAuditor.id, entidad: "familia", registroId: String(familiaLoma.id), accion: "CREATE", fecha: moment("2026-03-01"), datosNuevos: "synthetic-seed", descripcion: "Auditoría ficticia generada por el seed." });
  await ensure(prisma.bitacora, { usuarioId: usuarioAuditor.id, entidad: "evaluacion_cultivo", registroId: String(evaluacionLoma.id), accion: "UPDATE", fecha: moment("2026-03-15") }, { usuarioId: usuarioAuditor.id, entidad: "evaluacion_cultivo", registroId: String(evaluacionLoma.id), accion: "UPDATE", fecha: moment("2026-03-15"), datosAnteriores: "synthetic-before", datosNuevos: "synthetic-after", descripcion: "Auditoría ficticia generada por el seed." });

  console.log("Synthetic seed completed: 3 communities, 3 families, 4 members, 3 cycles, 2 productions, 2 sales, 3 evaluations, 3 inputs, 2 trainings, 2 evidences, 2 alerts, 3 users.");
}

main()
  .catch((error) => {
    console.error("Synthetic seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
