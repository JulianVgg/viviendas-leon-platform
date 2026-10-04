export default function ComponentCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
      <h2 className="font-medium text-slate-900 dark:text-white">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
    <div className="p-5">{children}</div>
  </section>
}
