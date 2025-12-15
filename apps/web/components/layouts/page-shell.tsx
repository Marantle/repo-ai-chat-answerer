import { ReactNode } from 'react'

interface PageShellProps {
  title: string
  description: string
  maxWidth?: 'default' | 'wide'
  children: ReactNode
}

export function PageShell({ title, description, maxWidth = 'default', children }: PageShellProps) {
  const widthClass = maxWidth === 'wide' ? 'max-w-7xl' : 'max-w-6xl'

  return (
    <div className="min-h-screen bg-background p-8">
      <div className={`${widthClass} mx-auto space-y-6`}>
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
