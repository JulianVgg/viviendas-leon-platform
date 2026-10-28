import { canViewPath, type PermissionUser } from '@/features/auth/screenPermissions'

/** Solo rutas internas, conocidas y autorizadas. Nunca se abre una URL externa. */
export function obtenerDestinoSeguro(referencia: string | null, usuario: PermissionUser | null): string | null {
  if (!referencia || !usuario || !referencia.startsWith('/') || referencia.startsWith('//') ||
      /[\\\s\u0000-\u001f\u007f]/.test(referencia)) return null
  try {
    const parsed = new URL(referencia, 'https://viviendas-leon.local')
    if (parsed.origin !== 'https://viviendas-leon.local' || parsed.username || parsed.password ||
        // Se rechaza codificación del path para evitar rutas ambiguas.
        parsed.pathname.includes('%')) return null
    // Los avisos creados antes de separar calendarios siguen llevando a un destino válido.
    if (parsed.pathname === '/calendario' && !canViewPath(usuario, '/calendario')) {
      return canViewPath(usuario, '/visitas/agenda') ? '/visitas/agenda' : '/notificaciones'
    }
    if (!canViewPath(usuario, parsed.pathname)) return null
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

export function tiempoNotificacion(valor: string): string {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible'
  const segundos = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 1_000))
  if (segundos < 60) return 'Ahora'
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Hace ${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias < 7) return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }).format(fecha)
}

export function fechaNotificacion(valor: string): string {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(fecha)
}
