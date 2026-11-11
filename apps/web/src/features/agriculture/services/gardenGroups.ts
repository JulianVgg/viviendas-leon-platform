import type { Garden } from './gardens'

export type MainStructure = 'CAMPO_ABIERTO' | 'MACROTUNEL' | 'MIXTO'
export type GardenGroup = MainStructure | 'SIN_CLASIFICAR'

export const mainStructures: { value: MainStructure; title: string; caption: string }[] = [
  { value: 'CAMPO_ABIERTO', title: 'Campo abierto', caption: 'Cultivo al aire libre' },
  { value: 'MACROTUNEL', title: 'Macrotúnel', caption: 'Cultivo protegido' },
  { value: 'MIXTO', title: 'Mixto', caption: 'Cultivo combinado' },
]

// Mantener visibles los huertos históricos sin entorno, sin clasificarlos artificialmente.
export function matchesGardenGroup(garden: Pick<Garden, 'entornoCultivo'>, group: GardenGroup): boolean {
  return group === 'SIN_CLASIFICAR'
    ? !garden.entornoCultivo || garden.entornoCultivo === 'OTRO'
    : garden.entornoCultivo === group
}
