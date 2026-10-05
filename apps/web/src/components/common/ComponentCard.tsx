import type { ReactNode } from 'react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'

export default function ComponentCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <Card><CardHeader title={title} description={description} /><CardBody>{children}</CardBody></Card>
}
