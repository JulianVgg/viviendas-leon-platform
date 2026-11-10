import { useEffect, useState } from 'react'
import { ImagePlus, Trash2, UserRound } from 'lucide-react'
import Button from '@/components/ui/Button'

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function photoValidation(file: File): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return 'Selecciona una fotografía JPG, PNG o WebP.'
  if (!file.size || file.size > MAX_PHOTO_BYTES) return 'La fotografía debe pesar menos de 4 MB.'
  return null
}

type Props = {
  file: File | null
  onChange: (file: File | null) => void
  currentUrl?: string | null
  removeExisting?: boolean
  onRemoveExisting?: () => void
  disabled?: boolean
}

export default function FamilyPhotoField({ file, onChange, currentUrl, removeExisting, onRemoveExisting, disabled }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const visible = preview || (removeExisting ? null : currentUrl)
  return <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
      {visible ? <img src={visible} alt="Foto de la persona de referencia" className="size-full object-cover" /> : <UserRound size={30} aria-hidden="true" />}
    </div>
    <div className="min-w-0 flex-1 space-y-2">
      <label htmlFor="family-photo" className="block text-sm font-medium text-gray-800 dark:text-gray-200">Fotografía de referencia (opcional)</label>
      <input id="family-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} className="block w-full max-w-sm text-sm text-gray-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700 hover:file:bg-brand-100 dark:text-gray-300" onChange={(e) => {
        const selected = e.target.files?.[0] ?? null
        e.target.value = ''
        if (!selected) return
        const problem = photoValidation(selected)
        if (problem) { setError(problem); return }
        setError(null); onChange(selected)
      }} />
      <div className="flex flex-wrap gap-2">
        {file && <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => onChange(null)}><Trash2 size={14} />Descartar selección</Button>}
        {!file && currentUrl && onRemoveExisting && <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => { setError(null); onRemoveExisting() }}><ImagePlus size={14} />{removeExisting ? 'Conservar fotografía' : 'Quitar fotografía'}</Button>}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  </div>
}
