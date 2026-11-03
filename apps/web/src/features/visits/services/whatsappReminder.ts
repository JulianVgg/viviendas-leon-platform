// NTF-13: el número se consulta en línea y nunca se agrega al caché offline.
export type WhatsAppRecipient = { id: number; nombre: string; telefono: string }
export type WhatsAppReminderData = { visitaId: number; fecha: string; destinatarios: WhatsAppRecipient[] }

export async function getWhatsAppReminder(visitId: number, signal?: AbortSignal): Promise<WhatsAppReminderData> {
  const response = await fetch(`/api/v1/visitas/agenda/${visitId}/recordatorio-whatsapp`, {
    credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal,
  })
  const payload = await response.json().catch(() => null) as { data?: WhatsAppReminderData; error?: string } | null
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('No tienes una sesión autorizada para preparar este recordatorio.')
    if (response.status === 404) throw new Error('La visita no existe o no tienes acceso a ella.')
    if (response.status === 409) throw new Error('La visita está vencida o ya no está programada. Revisa la agenda.')
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'No se pudieron consultar los contactos. Comprueba la conexión y vuelve a intentar.')
  }
  if (!payload?.data || !Array.isArray(payload.data.destinatarios)) throw new Error('La respuesta del servidor no es válida.')
  return payload.data
}

export function mensajeDeRecordatorio(fechaISO: string): string {
  const fecha = new Date(`${fechaISO}T12:00:00Z`).toLocaleDateString('es-GT', {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric',
  })
  return `Buen día. Le saludamos de Viviendas León.\n\nLe recordamos que tenemos programada una visita técnica para el día ${fecha}.\n\nSi necesita coordinar algún detalle, puede responder a este mensaje. ¡Gracias!`
}

export function enlaceWhatsapp(telefono: string, mensaje: string): string {
  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
}
