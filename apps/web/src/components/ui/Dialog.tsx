import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Button from './Button'
import { cn } from '@/app/lib/cn'

// Multiple dialogs share the lock so closing one cannot unlock another.
let scrollLockCount = 0
let previousOverflow = ''
let previousOverflowPriority = ''

function lockBackgroundScroll() {
  if (scrollLockCount === 0) {
    previousOverflow = document.body.style.getPropertyValue('overflow')
    previousOverflowPriority = document.body.style.getPropertyPriority('overflow')
    document.body.style.setProperty('overflow', 'hidden')
  }
  scrollLockCount += 1
  return () => {
    scrollLockCount -= 1
    if (scrollLockCount === 0) {
      if (previousOverflow) document.body.style.setProperty('overflow', previousOverflow, previousOverflowPriority)
      else document.body.style.removeProperty('overflow')
    }
  }
}

export default function Dialog({ open, title, description, onClose, children, actions, className }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; actions?: ReactNode; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // showModal places the dialog in the top layer and makes the rest of the page inert.
    dialog.showModal()
    const unlockScroll = lockBackgroundScroll()
    closeButtonRef.current?.focus()
    return () => {
      dialog.close()
      unlockScroll()
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  if (!open) return null
  return createPortal(<dialog
    ref={dialogRef}
    aria-modal="true"
    aria-labelledby={titleId}
    aria-describedby={description ? descriptionId : undefined}
    className={cn('dialog-enter custom-scrollbar fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 text-slate-700 shadow-theme-lg backdrop:bg-slate-950/50 backdrop:backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300', className)}
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
    }}
  >
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6 dark:border-slate-800">
      <div className="min-w-0 break-words"><h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}</div>
      <Button ref={closeButtonRef} type="button" variant="ghost" size="sm" className="shrink-0" aria-label="Cerrar diálogo" onClick={onClose}>Cerrar</Button>
    </div>
    <div className="p-5 sm:p-6">{children}</div>
    {actions && <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:flex-wrap sm:justify-end sm:p-6 dark:border-slate-800 dark:bg-white/5">{actions}</div>}
  </dialog>, document.body)
}
