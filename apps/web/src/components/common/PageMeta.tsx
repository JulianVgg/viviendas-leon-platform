import { useEffect } from 'react'

export default function PageMeta({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = title
    const meta = document.querySelector('meta[name="description"]') ?? document.createElement('meta')
    meta.setAttribute('name', 'description')
    meta.setAttribute('content', description)
    document.head.appendChild(meta)
  }, [title, description])
  return null
}
