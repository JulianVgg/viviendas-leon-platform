import test from 'node:test'
import assert from 'node:assert/strict'
import { construirIndicadoresFamilias, participacionVigente } from '../src/modules/dashboard/families-programs.rules.ts'
const programa = (programaId, estado = 'ACTIVO', fechaSalida = null, fechaIngreso = null) => ({programaId,estado,fechaSalida,fechaIngreso})
const familias = [
 {id:1,comunidad:{nombre:'Los Planes'},programas:[programa(1),programa(2)]},
 {id:2,comunidad:{nombre:'Los Planes'},programas:[programa(1,'INACTIVA')]},
 {id:3,comunidad:{nombre:'Paxub'},programas:[programa(1,'ACTIVO',new Date('2026-10-28T00:00:00Z'))]},
 {id:4,comunidad:{nombre:'Paxub'},programas:[programa(2)]},
]
const programas = [{id:1,nombre:'Huertos',estado:'ACTIVO'},{id:2,nombre:'Becas',estado:'ACTIVO'}]
test('no duplica una familia que participa en dos programas', () => {
 const r=construirIndicadoresFamilias(familias,programas,'2026-10-29')
 assert.equal(r.totalFamilias,4)
 assert.equal(r.familiasConPrograma,2)
 assert.equal(r.familiasSinPrograma,2)
 assert.equal(r.porcentajeCobertura,50)
 assert.deepEqual(r.programas.map(p=>[p.id,p.familias]),[[2,2],[1,1]])
 assert.deepEqual(r.comunidades.map(c=>[c.nombre,c.total,c.conPrograma]),[['Los Planes',2,1],['Paxub',2,1]])
})
test('participación con fecha de salida anterior a hoy no cuenta como vigente', () => {
 assert.equal(participacionVigente(programa(1,'ACTIVO',new Date('2026-10-28T00:00:00Z')),'2026-10-29'),false)
 assert.equal(participacionVigente(programa(1,'ACTIVO',new Date('2026-10-29T00:00:00Z')),'2026-10-29'),true)
})
test('un catálogo sin familias evita división por cero',()=>{
 const r=construirIndicadoresFamilias([],programas,'2026-10-29')
 assert.equal(r.porcentajeCobertura,0)
 assert.ok(r.programas.every(p=>p.porcentaje===0))
})
