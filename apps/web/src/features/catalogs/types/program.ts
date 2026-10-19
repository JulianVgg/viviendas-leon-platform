export type ProgramState = 'ACTIVO' | 'INACTIVO'

export type AdminProgram = {
  id: number
  nombre: string
  descripcion: string | null
  fechaInicio: string | null
  fechaFin: string | null
  estado: ProgramState
  participacionesCount: number
}

export type ProgramFormData = Omit<AdminProgram, 'id' | 'participacionesCount'>
export type ProgramOption = Pick<AdminProgram, 'id' | 'nombre' | 'descripcion' | 'estado'>
