/** NTF-12: destino autorizado de un aviso guardado en el backend.
 * El permiso de PANTALLA_VISITAS_AGENDA del menú no basta para acceder a la API.
 */
export type UsuarioDestinoPush = { roles: string[]; permisos: string[] }
const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

export function destinoPushAutorizado(referencia: string | null, usuario: UsuarioDestinoPush): string {
  if (!referencia || /[\\\s\u0000-\u001f\u007f]/.test(referencia) ||
    !referencia.startsWith('/') || referencia.startsWith('//') || referencia.includes('%')) {
    return '/notificaciones'
  }
  // Solo dos roles de supervisión tienen acceso al calendario institucional.
  const roles = usuario.roles.map(normalizar)
  const direccion = roles.includes('direccion general')
  const coordinacion = roles.includes('coordinadora del programa agroforestal')
  if (referencia === '/calendario') {
    return direccion || coordinacion ? referencia : '/notificaciones'
  }
  const visitaAutorizada = direccion || coordinacion ||
    ['SYN-VISITAS-WRITE', 'VISITAS_READ', 'VISITAS_WRITE'].some(p => usuario.permisos.includes(p))
  if (visitaAutorizada && (
    referencia === '/visitas/agenda' ||
    /^\/visitas\/agenda\?visitId=[1-9]\d{0,9}$/.test(referencia) ||
    /^\/visitas\/agenda\?seguimientoId=[a-fA-F0-9-]{36}$/.test(referencia)
  )) return referencia
  if (referencia === '/notificaciones' ||
    /^\/notificaciones\?invitacion=[1-9]\d{0,9}$/.test(referencia)) return referencia
  return '/notificaciones'
}
