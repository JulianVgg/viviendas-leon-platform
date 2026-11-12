/** Identificación no textual del estado de familia; mantiene título accesible. */
export const isActiveFamily = (state: string) => state.trim().toUpperCase() === 'ACTIVA'
export function familySelectLabel(name: string, state: string): string {
  return `${isActiveFamily(state) ? '🟢' : '🔴'} ${name}`
}
export default function FamilyStatusDot({ state }: { state: string }) {
  return <span role="img" aria-label={isActiveFamily(state) ? 'Familia activa' : 'Familia no activa'} title={isActiveFamily(state) ? 'Activa' : 'No activa'}
    className={`inline-block size-2.5 shrink-0 rounded-full ${isActiveFamily(state) ? 'bg-emerald-500' : 'bg-rose-500'}`} />
}
