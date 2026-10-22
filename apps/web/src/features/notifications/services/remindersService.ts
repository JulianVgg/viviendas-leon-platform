export type OpcionRecordatorio = 'DOS_DIAS_ANTES' | 'DIA_ANTES' | 'MISMO_DIA'
export type ReglaRecordatorio = { tipo: OpcionRecordatorio } | { tipo: 'PERSONALIZADO'; fechaHora: string }
export type ConfigRecordatorios = ReglaRecordatorio[] | null
export const OPCIONES_RECORDATORIO: { tipo: OpcionRecordatorio; etiqueta: string }[] = [
  { tipo: 'DOS_DIAS_ANTES', etiqueta: '2 días antes (8:00 a. m.)' },
  { tipo: 'DIA_ANTES', etiqueta: '1 día antes (8:00 a. m.)' },
  { tipo: 'MISMO_DIA', etiqueta: 'El mismo día (8:00 a. m.)' },
]
export async function getPreferenciasRecordatorio(): Promise<OpcionRecordatorio[]> {
  const response = await fetch('/api/v1/recordatorios/preferencias', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new Error('No se pudieron cargar las preferencias de recordatorios.')
  const body = await response.json() as { anticipaciones: OpcionRecordatorio[] }
  return body.anticipaciones
}
export async function setPreferenciasRecordatorio(anticipaciones: OpcionRecordatorio[]): Promise<void> {
  const response = await fetch('/api/v1/recordatorios/preferencias', {
    method: 'PUT', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ anticipaciones }),
  })
  if (!response.ok) throw new Error('No se pudieron guardar las preferencias de recordatorios.')
}
