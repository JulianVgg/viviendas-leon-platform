import type { ReactNode } from 'react'
import DataTable from '@/components/ui/DataTable'

export default function DataTableContainer({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return <DataTable columns={columns} rows={rows} />
}
