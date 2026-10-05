import type { ReactNode } from 'react'
import { cn } from '@/app/lib/cn'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'

type FormSectionProps = {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  variant?: 'plain' | 'outlined' | 'card'
}

export default function FormSection({ title, description, children, className, variant = 'plain' }: FormSectionProps) {
  if (variant === 'card') {
    return <Card className={className}>
      {title && <CardHeader title={title} description={description} />}
      <CardBody className={cn(!title && 'pt-5')}>{children}</CardBody>
    </Card>
  }

  return <section className={cn(
    'space-y-4',
    variant === 'outlined' && 'rounded-xl border border-slate-200 p-5 dark:border-slate-800',
    className,
  )}>
    {(title || description) && <div>
      {title && <h2 className="font-medium text-slate-900 dark:text-white">{title}</h2>}
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>}
    {children}
  </section>
}
