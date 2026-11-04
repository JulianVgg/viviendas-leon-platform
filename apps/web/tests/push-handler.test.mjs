import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const script = readFileSync(new URL('../public/push-handler.js', import.meta.url), 'utf8')
function preparar() {
  const handlers = {}
  const notificaciones = []
  const ventanas = []
  const origin = 'https://viviendas.ejemplo.test'
  const self = {
    location: { origin },
    registration: { showNotification: async (titulo, opciones) => {
      notificaciones.push({ titulo, opciones })
    } },
    clients: {
      matchAll: async () => ventanas,
      openWindow: async url => { ventanas.push({ url, focus: async () => {} }) },
    },
    addEventListener: (nombre, handler) => { handlers[nombre] = handler },
  }
  runInNewContext(script, { self, URL, Number, Array, Object })
  return { handlers, notificaciones, ventanas, origin }
}

async function push(instancia, valor) {
  let promesa
  instancia.handlers.push({
    data: valor === undefined ? null : { json: () => valor },
    waitUntil: p => { promesa = p },
  })
  await promesa
  return instancia.notificaciones.at(-1)
}

async function click(instancia, opciones) {
  let promesa
  instancia.handlers.notificationclick({
    notification: { data: opciones, close: () => {} },
    waitUntil: p => { promesa = p },
  })
  await promesa
}

test('NTF-12 Web Push muestra texto genérico y solo guarda el identificador', async () => {
  const sw = preparar()
  const aviso = await push(sw, { notificacionId: 54, url: '/visitas/agenda', titulo: 'NOMBRE PRIVADO' })
  assert.equal(aviso.titulo, 'Viviendas León')
  assert.equal(aviso.opciones.body.includes('NOMBRE PRIVADO'), false)
  assert.equal(aviso.opciones.data.url, undefined)
  assert.equal(aviso.opciones.data.id, 54)
  await click(sw, aviso.opciones.data)
  assert.equal(sw.ventanas[0].url, sw.origin + '/notificaciones?pushId=54')
})

test('NTF-12 bloquea URL externa y preserva prueba manual sin payload', async () => {
  const sw = preparar()
  const externo = await push(sw, { notificacionId: 55, url: 'https://sitio-malicioso.test' })
  assert.equal(externo.opciones.data.url, undefined)
  await click(sw, { url: 'https://sitio-malicioso.test' })
  assert.equal(sw.ventanas[0].url, sw.origin + '/notificaciones')
  const manual = await push(sw)
  assert.equal(manual.opciones.data.id, null)
})

test('NTF-12 reutiliza ventana de origen correcto sin enfocar otro dominio', async () => {
  const sw = preparar()
  const navegaciones = []
  sw.ventanas.push({ url: 'https://otro-sitio.test/', navigate: async () => { throw Error('No debería navegar fuera') } })
  sw.ventanas.push({
    url: sw.origin + '/notificaciones',
    navigate: async url => { navegaciones.push(url); return { focus: async () => {} } },
  })
  await click(sw, { id: 56, url: '/calendario' })
  assert.deepEqual(navegaciones, [sw.origin + '/notificaciones?pushId=56'])
})
