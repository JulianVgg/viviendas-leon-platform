import { useEffect, useRef, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import type { VisitListItem } from '@/features/visits/services/visitService'
import { enlaceWhatsapp, getWhatsAppReminder, mensajeDeRecordatorio, type WhatsAppReminderData } from '@/features/visits/services/whatsappReminder'

export default function WhatsAppReminderDialog({ visit, onClose }: { visit: VisitListItem | null; onClose: () => void }) {
  const [data, setData] = useState<WhatsAppReminderData | null>(null)
  const [recipientId, setRecipientId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const editor = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const id = visit?.id
    if (!id) return
    const controller = new AbortController()
    setLoading(true)
    setData(null)
    setError('')
    setNotice('')
    setRecipientId(null)
    setMessage('')
    void getWhatsAppReminder(id, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return
        setData(result)
        setRecipientId(result.destinatarios[0]?.id ?? null)
        setMessage(mensajeDeRecordatorio(result.fecha))
      })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible preparar el recordatorio.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [visit?.id])

  const recipient = data?.destinatarios.find(item => item.id === recipientId)
  const canOpen = Boolean(recipient && message.trim())
  const link = recipient && message.trim() ? enlaceWhatsapp(recipient.telefono, message) : ''

  async function copyMessage() {
    if (!message.trim()) return
    try {
      await navigator.clipboard.writeText(message)
      setNotice('Mensaje copiado. Puedes pegarlo en WhatsApp.')
    } catch {
      editor.current?.focus()
      editor.current?.select()
      setNotice('No se pudo copiar automáticamente. Selecciona y copia el texto del recuadro.')
    }
  }

  return <Dialog open={Boolean(visit)} onClose={onClose} title="Recordatorio por WhatsApp"
    description={visit ? `${visit.familyName} · visita del ${visit.date}` : ''}
    actions={<>
      <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
      <Button type="button" variant="secondary" disabled={!message.trim()} onClick={() => void copyMessage()}>Copiar mensaje</Button>
      {canOpen && <a href={link} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">Abrir WhatsApp</a>}
    </>}>
    <div className="space-y-4 text-sm">
      {loading && <p role="status">Consultando contactos autorizados…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
      {!loading && data && !data.destinatarios.length && <p role="status" className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">No hay integrantes activos con teléfono válido y autorización registrada. Actualiza el expediente familiar antes de preparar el envío.</p>}
      {data && data.destinatarios.length > 0 && <>
        <label htmlFor="whatsapp-contacto" className="block font-medium text-slate-800 dark:text-slate-100">Contacto autorizado</label>
        <select id="whatsapp-contacto" value={recipientId ?? ''} onChange={event => setRecipientId(Number(event.target.value))}
          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          {data.destinatarios.map(item => <option key={item.id} value={item.id}>{item.nombre} · +{item.telefono}</option>)}
        </select>
        <label htmlFor="whatsapp-mensaje" className="block font-medium text-slate-800 dark:text-slate-100">Mensaje editable</label>
        <textarea id="whatsapp-mensaje" ref={editor} value={message} maxLength={1500} rows={7}
          onChange={event => { setMessage(event.target.value); setNotice('') }}
          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
      </>}
      {notice && <p role="status" className="text-xs text-slate-700 dark:text-slate-200">{notice}</p>}
    </div>
  </Dialog>
}
