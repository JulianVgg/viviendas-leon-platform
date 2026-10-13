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
      <CardBody>{!title && description && <p className="mb-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}{children}</CardBody>
    </Card>
  }

  return <section className={cn(
    'min-w-0 space-y-5',
    variant === 'outlined' && 'rounded-2xl border border-slate-200 bg-white p-4 shadow-theme-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900',
    className,
  )}>
    {(title || description) && <div>
      {title && <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>}
      {description && <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}
    </div>}
    {children}
  </section>
}
