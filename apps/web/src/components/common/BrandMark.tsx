import { cn } from '@/app/lib/cn'

type BrandMarkProps = {
  className?: string
  decorative?: boolean
}

/** Símbolo simplificado VL proporcionado por Viviendas León. */
export default function BrandMark({ className, decorative = false }: BrandMarkProps) {
  return (
    <img
      src="/branding/viviendas-leon-mark.png"
      width={440}
      height={415}
      alt={decorative ? '' : 'Viviendas León'}
      aria-hidden={decorative ? true : undefined}
      className={cn('block shrink-0 rounded-lg object-contain', className)}
      decoding="async"
    />
  )
}
