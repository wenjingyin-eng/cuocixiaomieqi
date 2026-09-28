import type { HTMLAttributes, ReactNode } from 'react'

type SurfaceCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  as?: 'section' | 'article' | 'div'
}

export function SurfaceCard({ children, as: Element = 'section', className = '', ...props }: SurfaceCardProps) {
  return (
    <Element className={`surface-card ${className}`.trim()} {...props}>
      {children}
    </Element>
  )
}
