// Comunidades oficiales habilitadas para nuevos registros.
// Los registros históricos de otros catálogos siguen disponibles por su identificador.
export const OFFICIAL_MUNICIPALITY = 'Santa Lucía Utatlán'
export const OFFICIAL_COMMUNITY_NAMES = [
  'Barrio La Esperanza', 'Ciénaga Grande', 'Los Planes', 'Paxub’', 'Payajut',
] as const
export const officialCommunityFilter = {
  municipio: { activo: true, nombre: { equals: OFFICIAL_MUNICIPALITY, mode: 'insensitive' as const } },
  OR: OFFICIAL_COMMUNITY_NAMES.map((nombre) => ({ nombre: { equals: nombre, mode: 'insensitive' as const } })),
}
