import type { HTMLAttributes } from 'react'
import { cn } from '@/app/lib/cn'

type FormGridProps = HTMLAttributes<HTMLDivElement> & {
  columns?: 1 | 2 | 3
}

export default function FormGrid({ columns = 2, className, ...props }: FormGridProps) {
  return <div className={cn(
    'grid grid-cols-1 gap-4',
    columns === 2 && 'sm:grid-cols-2',
    columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
    className,
  )} {...props} />
}
