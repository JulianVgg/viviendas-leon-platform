import test from 'node:test'
import assert from 'node:assert/strict'
import { validDay, validMonth, validAmount, positiveId, textField, isFinType, externalTotals, accountBalance } from '../dist/modules/finance/finance.rules.js'

test('fechas válidas; no permite fechas inexistentes ni meses fuera del año', () => {
  assert.equal(validDay('2026-11-20'),true)
  assert.equal(validDay('2026-02-30'),false)
  assert.equal(validDay('2024-02-29'),true)
  assert.equal(validMonth('2026-11'),true)
  assert.equal(validMonth('2026-13'),false)
})
test('importes positivos con máximo dos decimales y hasta nueve enteros',()=>{
  assert.equal(validAmount('1.20'),true)
  assert.equal(validAmount('0.00'),false)
  assert.equal(validAmount('-5.00'),false)
  assert.equal(validAmount('10.235'),false)
  assert.equal(validAmount('5000000000'),false)
  assert.equal(validAmount('0',true),true)
})
test('no admite identificadores fraccionarios ni tipos de cuenta inventados',()=>{
  assert.equal(positiveId('12'),12)
  assert.equal(positiveId('0'),null)
  assert.equal(positiveId('1.7'),null)
  assert.equal(isFinType('fondos-medicos'),true)
  assert.equal(isFinType('cuentas-secretas'),false)
  assert.equal(textField('  Transporte  ',120,true),'Transporte')
})
test('saldo conserva anulados como historia y no los suma',()=>{
  assert.equal(accountBalance('100.00',[{tipo:'INGRESO',importe:'20.00'},{tipo:'EGRESO',importe:'15.00'},{tipo:'INGRESO',importe:'900',anulado:true}]),105)
})
test('informe calcula resultado externo por categorías, no necesita transferencias internas',()=>{
  assert.deepEqual(externalTotals([{ingresos:'150.00',egresos:'0.00'},{ingresos:'0.00',egresos:'25.25'}]),{ingresos:'150.00',egresos:'25.25',resultado:'124.75'})
  assert.deepEqual(externalTotals([{ingresos:'0.10',egresos:'0.00'},{ingresos:'0.20',egresos:'0.00'}]),{ingresos:'0.30',egresos:'0.00',resultado:'0.30'})
})
