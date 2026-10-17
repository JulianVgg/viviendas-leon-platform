import { useEffect, useState, type FormEvent } from 'react'
import { Pencil } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'

const campo = 'w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

export default function EditarDatosPerfil() {
  const { usuario, verificarSesion } = useAuth()
  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [apellido, setApellido] = useState(usuario?.apellido ?? '')
  const [correo, setCorreo] = useState(usuario?.correo ?? '')
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  // Mantener el formulario alineado con la sesión si esta se actualiza.
  useEffect(() => {
    if (!usuario) return
    setNombre(usuario.nombre)
    setApellido(usuario.apellido ?? '')
    setCorreo(usuario.correo)
    setTelefono(usuario.telefono ?? '')
  }, [usuario])

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (guardando) return
    setError('')
    setMensaje('')
    if (!nombre.trim() || !correo.trim()) {
      setError('El nombre y el correo son obligatorios.')
      return
    }
    setGuardando(true)
    try {
      const respuesta = await fetch('/api/v1/perfil', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          correo: correo.trim(),
          telefono: telefono.trim(),
        }),
      })
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null)
        setError(datos?.error?.message ?? 'No fue posible guardar los cambios.')
        return
      }
      if (!(await verificarSesion())) {
        setError('Los datos se guardaron, pero no pudimos actualizar la sesión. Inicia sesión otra vez.')
        return
      }
      setMensaje('Tu información personal se actualizó correctamente.')
    } catch {
      setError('No fue posible conectar con el servidor.')
    } finally {
      setGuardando(false)
    }
  }

  if (!usuario) return null

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex items-center gap-3">
        <Pencil className="text-blue-600" size={22} />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Editar mi información</h2>
      </div>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Puedes modificar únicamente tus datos personales. El rol y el estado de tu cuenta no se pueden editar aquí.</p>
      <form onSubmit={(e) => void guardar(e)} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div><label htmlFor="perfil-editar-nombre" className="mb-2 block text-sm font-medium">Nombre</label><input id="perfil-editar-nombre" className={campo} maxLength={100} required value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          <div><label htmlFor="perfil-editar-apellido" className="mb-2 block text-sm font-medium">Apellido</label><input id="perfil-editar-apellido" className={campo} maxLength={100} value={apellido} onChange={(e) => setApellido(e.target.value)} /></div>
          <div><label htmlFor="perfil-editar-correo" className="mb-2 block text-sm font-medium">Correo electrónico</label><input id="perfil-editar-correo" className={campo} type="email" maxLength={254} required value={correo} onChange={(e) => setCorreo(e.target.value)} /></div>
          <div><label htmlFor="perfil-editar-telefono" className="mb-2 block text-sm font-medium">Teléfono</label><input id="perfil-editar-telefono" className={campo} type="tel" maxLength={30} value={telefono} onChange={(e) => setTelefono(e.target.value)} /></div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {mensaje && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensaje}</p>}
        <button type="submit" disabled={guardando} className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
      </form>
    </section>
  )
}
