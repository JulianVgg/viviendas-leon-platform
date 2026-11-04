// NTF-13: solo se permiten números con prefijo internacional explícito o
// números guatemaltecos de 8 dígitos (a los que se agrega 502).
export function normalizarTelefonoWhatsapp(value: string | null | undefined): string | null {
  if (!value) return null
  const input = value.trim()
  if (!/^\+?[\d\s().-]+$/.test(input)) return null
  const digits = input.replace(/\D/g, '')
  if (!input.startsWith('+') && /^\d{8}$/.test(digits)) return `502${digits}`
  if (/^502\d{8}$/.test(digits)) return digits
  if (input.startsWith('+') && /^[1-9]\d{7,14}$/.test(digits)) return digits
  return null
}
