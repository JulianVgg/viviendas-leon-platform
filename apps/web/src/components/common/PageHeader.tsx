import PageBreadCrumb from './PageBreadCrumb'

export default function PageHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return <>
    <PageBreadCrumb pageTitle={title} />
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 gap-3">{actions}</div>}
    </div>
  </>
}
