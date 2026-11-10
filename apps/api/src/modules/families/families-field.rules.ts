// Validación de datos personales sin depender de restricciones del navegador.
export const familyNamePattern = /^[\p{L}\p{M}][\p{L}\p{M} .\-'’]*$/u
export const memberRolePattern = familyNamePattern
export const MAX_INTEGRAL_MEMBERS = 30
export const MAX_INTEGRAL_PROGRAMS = 20
export const MAX_MEMBER_NAME = 150
export const MAX_ROLE_NAME = 60
export const MAX_PHONE_LENGTH = 30
export const ALLOWED_SEX = ['Masculino', 'Femenino']
export const DEFAULT_ROLES = ['Madre', 'Padre', 'Hijo', 'Hija']
export function validPersonName(value: string, max = MAX_MEMBER_NAME) {
  return value.length >= 2 && value.length <= max && familyNamePattern.test(value)
}
export function validMemberRole(value: string) {
  return value !== 'Otro' && validPersonName(value, MAX_ROLE_NAME)
}
export function validMemberPhone(value: string | null) {
  if (!value) return true
  return value.length <= MAX_PHONE_LENGTH && /^\+?[0-9](?:[0-9\s()\-]{0,28}[0-9])?$/.test(value) && value.replace(/\D/g, '').length >= 8
}
