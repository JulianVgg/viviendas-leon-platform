/** Regla de acceso real de la API de visitas. Un permiso visual del menú no basta. */
export type UsuarioAccesoVisitas = { roles: string[]; permisos: string[] }
const normalizar = (rol: string) => rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
export function puedeConsultarAgendaVisitas(usuario: UsuarioAccesoVisitas): boolean {
  const roles = usuario.roles.map(normalizar)
  return roles.includes('direccion general') ||
    roles.includes('coordinadora del programa agroforestal') ||
    ['VISITAS_READ', 'VISITAS_WRITE', 'SYN-VISITAS-WRITE'].some(codigo => usuario.permisos.includes(codigo))
}
