import PageBreadCrumb from './PageBreadCrumb'

export default function PageHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return <>
    <PageBreadCrumb pageTitle={title} />
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-title-sm font-semibold tracking-tight text-gray-800 dark:text-white/90">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  </>
}
