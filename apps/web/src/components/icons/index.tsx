import type { ReactNode } from 'react'

export function AppIcon({ label }: { label: string }): ReactNode {
  return <span aria-hidden="true" className="inline-flex size-6 items-center justify-center rounded-md bg-current/10 text-xs font-semibold">{label}</span>
}
