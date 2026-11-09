/** Mensajes seguros y breves para errores conservados en la cola local de visitas. */
export function mensajeErrorSincronizacion(error: string | null | undefined): string {
  const mensaje = error?.trim()
  if (!mensaje) return 'La visita sigue guardada en este dispositivo. Vuelve a intentar la sincronización.'

  if (/\b(401|sesión|sesion|inicia sesi[oó]n)\b/i.test(mensaje)) {
    return 'La sesión venció. Inicia sesión nuevamente y vuelve a intentar.'
  }
  if (/\b403\b|sin permiso|no autorizad[oa]/i.test(mensaje)) {
    return 'No tienes permiso para enviar esta visita. Consulta con Coordinación.'
  }
  if (/\b409\b|conflicto/i.test(mensaje)) {
    return 'Existe un conflicto con los datos del servidor. Revisa la visita antes de reintentar.'
  }
  if (/\b(400|422)\b|datos inv[aá]lidos|validaci[oó]n/i.test(mensaje)) {
    return 'El servidor rechazó algún dato de la visita. Revisa el registro antes de reintentar.'
  }
  if (/failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|timed out|\b(502|503|504)\b/i.test(mensaje)) {
    return 'No se pudo contactar al servidor. La visita permanece guardada en este dispositivo.'
  }
  return mensaje.length > 180 ? `${mensaje.slice(0, 177)}…` : mensaje
}
