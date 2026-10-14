import type { ReactNode } from 'react'

export type NavigationIconName = 'dashboard' | 'users' | 'sprout' | 'clipboard-list' | 'graduation-cap' | 'package' | 'chart'

export function NavigationIcon({ name }: { name: NavigationIconName }) {
  const shapes: Record<NavigationIconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    users: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 4v2" /></>,
    sprout: <><path d="M12 21v-9M12 16C6 16 3 12 3 7c6 0 9 3 9 9Zm0-4c0-6 3-9 9-9 0 6-3 9-9 9ZM8 21h8" /></>,
    'clipboard-list': <><rect x="5" y="4" width="14" height="17" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /><path d="M9 11h.01M12 11h4M9 16h.01M12 16h4" /></>,
    'graduation-cap': <><path d="m2 9 10-5 10 5-10 5L2 9Zm4 2v6c4 3 8 3 12 0v-6m4-2v8" /></>,
    package: <><path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm-9 5 9 5 9-5M12 13v9M7.5 5.5l9 5V15" /></>,
    chart: <><path d="M3 3v18h18M7 16v-5m5 5V7m5 9v-7" /></>,
  }
  return <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</svg>
}

export function AppIcon({ label }: { label: string }): ReactNode {
  return <span aria-hidden="true" className="inline-flex size-6 items-center justify-center rounded-md bg-current/10 text-xs font-semibold">{label}</span>
}
