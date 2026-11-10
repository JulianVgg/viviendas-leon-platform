// Reglas visibles en el formulario; la API comprueba nuevamente cada valor.
export type TrainingDraft = {
  tema: string; fecha: string; descripcion: string; facilitador: string
  horaInicio: string; horaFin: string; comunidadId: string; observaciones: string
}
export type TrainingErrors = Partial<Record<keyof TrainingDraft, string>>
const validDay = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const day = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value
}
const validTime = (value: string) => !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

export function validateTrainingForm(draft: TrainingDraft, minDate: string, communityIds: number[]): TrainingErrors {
  const errors: TrainingErrors = {}
  if (draft.tema.trim().length < 2 || draft.tema.trim().length > 160 || !/[\p{L}]/u.test(draft.tema) || /[\p{Cc}]/u.test(draft.tema)) errors.tema = 'Ingresa un tema válido de hasta 160 caracteres.'
  if (!validDay(draft.fecha) || draft.fecha < minDate) errors.fecha = 'Selecciona una fecha vigente.'
  if (draft.descripcion.trim().length > 2000) errors.descripcion = 'Máximo 2000 caracteres.'
  if (draft.observaciones.trim().length > 2000) errors.observaciones = 'Máximo 2000 caracteres.'
  if (draft.facilitador.trim().length > 160 || (draft.facilitador.trim() && !/^[\p{L}\p{M} .\-'’]+$/u.test(draft.facilitador.trim()))) errors.facilitador = 'Escribe un nombre válido, sin números.'
  if (!validTime(draft.horaInicio)) errors.horaInicio = 'Introduce una hora válida.'
  if (!validTime(draft.horaFin) || (draft.horaInicio && draft.horaFin && draft.horaFin <= draft.horaInicio)) errors.horaFin = 'La hora final debe ser posterior a la inicial.'
  if (draft.comunidadId && !communityIds.includes(Number(draft.comunidadId))) errors.comunidadId = 'Selecciona una comunidad disponible.'
  return errors
}
