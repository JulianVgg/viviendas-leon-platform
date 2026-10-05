export default function LoadingState({ label = 'Cargando contenido...' }: { label?: string }) {
  return <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center" role="status" aria-live="polite"><span aria-hidden="true" className="size-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" /><span className="text-sm text-slate-500 dark:text-slate-400">{label}</span></div>
}
