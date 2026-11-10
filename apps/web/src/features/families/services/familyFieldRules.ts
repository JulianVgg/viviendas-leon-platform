// Reglas compartidas entre registro y edición de expedientes.
export const MAX_FAMILY_NAME = 150
export const MAX_MEMBER_NAME = 150
export const MAX_ROLE_NAME = 60
export const MAX_PHONE = 30
export const MAX_NOTES = 2000
export const MAX_MEMBERS = 30
export const MAX_PROGRAMS = 20

// Letras con tildes y apóstrofos. No se aceptan cifras ni símbolos de control.
export const personOrFamilyName = /^[\p{L}\p{M}][\p{L}\p{M} .'’\-]*$/u
export const phonePattern = /^\+?[0-9](?:[0-9\s()\-]{0,28}[0-9])?$/
export const roleOptions = ['Madre', 'Padre', 'Hijo', 'Hija', 'Otro'] as const

export function onlyNameCharacters(value: string): string {
  return value.replace(/[\p{N}\p{Cc}]/gu, '')
}
export function onlyPhoneCharacters(value: string): string {
  return value.replace(/[^0-9+()\s-]/g, '')
}

export function validName(value: string, max: number): boolean {
  const trimmed = value.trim()
  return trimmed.length >= 2 && trimmed.length <= max && personOrFamilyName.test(trimmed)
}
export function validPhone(value: string): boolean {
  const trimmed = value.trim()
  return !trimmed || (trimmed.length <= MAX_PHONE && phonePattern.test(trimmed) && trimmed.replace(/\D/g, '').length >= 8)
}
export function validOtherRole(value: string): boolean {
  return validName(value, MAX_ROLE_NAME)
}
export function selectedRole(stored: string): string {
  return stored && !roleOptions.includes(stored as typeof roleOptions[number]) ? 'Otro' : stored
}
