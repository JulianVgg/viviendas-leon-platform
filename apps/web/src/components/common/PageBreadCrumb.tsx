import { Link } from 'react-router'

export default function PageBreadCrumb({ pageTitle }: { pageTitle: string }) {
  return <nav className="mb-5 flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
    <Link to="/" className="hover:text-blue-600">Inicio</Link>
    <span aria-hidden="true">/</span>
    <span className="text-slate-700 dark:text-slate-200">{pageTitle}</span>
  </nav>
}
