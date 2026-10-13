import type { ComponentProps } from 'react'
import DataTable from '@/components/ui/DataTable'

export default function DataTableContainer(props: ComponentProps<typeof DataTable>) {
  return <DataTable {...props} />
}
