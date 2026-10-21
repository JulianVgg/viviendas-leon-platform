import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'

type Theme = 'light' | 'dark'
type ThemeContextValue = { theme: Theme; toggleTheme: (trigger?: HTMLElement | null) => void }
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

type ThemeDocument = Document & {
  startViewTransition?: (update: () => void) => {
    ready: Promise<void>
    finished: Promise<void>
  }
}

function setHtmlTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.setAttribute('data-color-scheme', theme)
  document.documentElement.style.colorScheme = theme
  localStorage.setItem('theme', theme)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('theme') === 'dark' ? 'dark' : 'light')

  useEffect(() => { setHtmlTheme(theme) }, [theme])

  const toggleTheme = useCallback((trigger?: HTMLElement | null) => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    const commit = () => {
      flushSync(() => setTheme(next))
      setHtmlTheme(next)
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const doc = document as ThemeDocument
    if (!doc.startViewTransition || reduced) {
      if (!reduced) document.documentElement.classList.add('theme-soft-transition')
      commit()
      if (!reduced) window.setTimeout(() => document.documentElement.classList.remove('theme-soft-transition'), 260)
      return
    }

    const rect = trigger?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : 0
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    document.documentElement.classList.add('theme-view-transition')
    const transition = doc.startViewTransition(commit)
    void transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)' } as KeyframeAnimationOptions,
      )
    }).catch(() => { /* Navegadores sin animación de pseudo-elementos */ })
    void transition.finished.finally(() => {
      document.documentElement.classList.remove('theme-view-transition')
    })
  }, [theme])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
