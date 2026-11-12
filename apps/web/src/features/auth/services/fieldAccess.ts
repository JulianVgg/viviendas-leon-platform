import { getOfflineData, saveOfflineData, deleteOfflineData, purgeLegacyFieldCaches } from '@/db/offlineDb'
import { esTecnicoCampo } from '../calendarAccess'

/** Autorización temporal local, configurada tras autenticación real.
 * No genera una sesión de servidor. Se solicita una clave tras cada recarga offline.
 */
export type FieldUser = {
  id: number; nombre: string; apellido: string | null; telefono: string | null; correo: string
  departamento: string | null; municipio: string | null; direccion: string | null
  roles: string[]; permisos: string[]; debeCambiarPassword: boolean
}

const AUTH_KEY = 'field:authorization:v1'
export const FIELD_ACCESS_DURATION_MS = 48 * 60 * 60 * 1000
const ITERATIONS = 240_000

type FieldEnvelope = { v: 1; salt: number[]; iv: number[]; ciphertext: number[]; expiresAt: string }
let active: { userId: number; key: CryptoKey; expiresAt: number } | null = null

const bytes = (value: number[]) => new Uint8Array(value)
function validUser(user: unknown): user is FieldUser {
  if (!user || typeof user !== 'object') return false
  const u = user as Partial<FieldUser>
  return Number.isSafeInteger(u.id) && Number(u.id) > 0 && typeof u.nombre === 'string' &&
    typeof u.correo === 'string' && Array.isArray(u.roles) && Array.isArray(u.permisos) &&
    u.debeCambiarPassword === false && esTecnicoCampo(u as FieldUser)
}
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export function fieldAccessActive(userId: number): boolean {
  return active?.userId === userId && Date.now() < active.expiresAt
}
export function lockFieldAccess() { active = null }
export function requireFieldKey(userId: number): CryptoKey {
  if (!active || !fieldAccessActive(userId)) throw new Error('Prepara este dispositivo para guardar datos sin conexión.')
  return active.key
}

export async function encryptFieldData(userId: number, value: unknown): Promise<{ fieldEncrypted: 1; iv: number[]; data: number[] }> {
  const key = requireFieldKey(userId)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const result = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { fieldEncrypted: 1, iv: Array.from(iv), data: Array.from(new Uint8Array(result)) }
}
export async function decryptFieldData<T>(userId: number, value: unknown): Promise<T | null> {
  if (!value || typeof value !== 'object' || !('fieldEncrypted' in value) || value.fieldEncrypted !== 1) return null
  if (!fieldAccessActive(userId)) return null
  const envelope = value as unknown as { iv: number[]; data: number[] }
  try {
    const result = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(envelope.iv) }, requireFieldKey(userId), bytes(envelope.data))
    return JSON.parse(new TextDecoder().decode(result)) as T
  } catch { return null } // Datos de una preparación anterior: no se pueden consultar.
}

export async function fieldAccessExists(): Promise<boolean> {
  const record = await getOfflineData<FieldEnvelope>(AUTH_KEY)
  return Boolean(record && record.data.v === 1 && Date.parse(record.data.expiresAt) > Date.now())
}
export async function enableFieldAccess(user: FieldUser, passphrase: string): Promise<void> {
  if (!validUser(user)) throw new Error('Solo el personal técnico con contraseña actualizada puede preparar el acceso offline.')
  if (passphrase.length < 8 || passphrase.length > 64) throw new Error('Usa una clave de 8 a 64 caracteres.')
  const current = await getOfflineData<FieldEnvelope>(AUTH_KEY)
  if (current && current.data.v === 1) {
    // Renovar incluso una autorización caducada conservando la MISMA clave
    // derivada. Cambiarla rompería borradores y cachés que ya están cifrados.
    const key = await deriveKey(passphrase, bytes(current.data.salt))
    let prior: FieldUser
    try {
      const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(current.data.iv) }, key, bytes(current.data.ciphertext))
      prior = JSON.parse(new TextDecoder().decode(raw)) as FieldUser
    } catch { throw new Error('La clave de campo es incorrecta. No se reemplazaron tus datos locales.') }
    if (!validUser(prior) || prior.id !== user.id) throw new Error('Este dispositivo está preparado para otra cuenta.')
    const expiresAt = new Date(Date.now() + FIELD_ACCESS_DURATION_MS).toISOString()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(user)))
    await saveOfflineData(AUTH_KEY, { v: 1, salt: current.data.salt, iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(ciphertext)), expiresAt } satisfies FieldEnvelope)
    active = { userId: user.id, key, expiresAt: Date.parse(expiresAt) }
    return
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const expiresAt = new Date(Date.now() + FIELD_ACCESS_DURATION_MS).toISOString()
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(user)))
  await saveOfflineData(AUTH_KEY, { v: 1, salt: Array.from(salt), iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(ciphertext)), expiresAt } satisfies FieldEnvelope)
  active = { userId: user.id, key, expiresAt: Date.parse(expiresAt) }
  await purgeLegacyFieldCaches()
}

export async function unlockFieldAccess(passphrase: string): Promise<FieldUser> {
  const record = await getOfflineData<FieldEnvelope>(AUTH_KEY)
  if (!record || record.data.v !== 1 || Date.parse(record.data.expiresAt) <= Date.now()) {
    throw new Error('La autorización de campo caducó. Conéctate y prepara el dispositivo nuevamente.')
  }
  const { salt, iv, ciphertext, expiresAt } = record.data
  try {
    const key = await deriveKey(passphrase, bytes(salt))
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv) }, key, bytes(ciphertext))
    const user: unknown = JSON.parse(new TextDecoder().decode(plaintext))
    if (!validUser(user)) throw new Error('Perfil no autorizado.')
    active = { userId: user.id, key, expiresAt: Date.parse(expiresAt) }
    return user
  } catch {
    throw new Error('Clave de campo incorrecta o autorización dañada.')
  }
}

/** Revoca la autorización guardada sin borrar las operaciones pendientes. */
export async function revokeFieldAccess(): Promise<void> {
  lockFieldAccess()
  await deleteOfflineData(AUTH_KEY)
}

export function fieldAccessOwner(): number | null {
  return active && Date.now() < active.expiresAt ? active.userId : null
}
