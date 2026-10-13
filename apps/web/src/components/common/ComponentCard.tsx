import type { ReactNode } from 'react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'

export default function ComponentCard({ title, description, children, actions, className }: { title: string; description?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return <Card className={className}><CardHeader title={title} description={description} actions={actions} /><CardBody>{children}</CardBody></Card>
}
