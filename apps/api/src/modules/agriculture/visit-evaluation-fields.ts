/** Capturas de Visitas Técnicas conservan el texto elegido aun cuando el catálogo no coincida. */
export function datosEvaluacionDeCaptura(captura: unknown, cicloCultivoId: number): { etapa: string | null; calidad: string | null } {
  if (!captura || typeof captura !== 'object' || Array.isArray(captura)) return { etapa: null, calidad: null }
  const crops = (captura as Record<string, unknown>).crops
  if (!Array.isArray(crops)) return { etapa: null, calidad: null }
  const matches = crops.filter(item => item && typeof item === 'object' && !Array.isArray(item) &&
    (item as Record<string, unknown>).cicloCultivoId === cicloCultivoId)
  if (matches.length !== 1) return { etapa: null, calidad: null }
  const c = matches[0] as Record<string, unknown>
  const field = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 60) : null
  return { etapa: field(c.stage), calidad: field(c.quality) }
}
