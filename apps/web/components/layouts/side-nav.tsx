'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bookmark, Settings, TrendingUp, BarChart3, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: MessageSquare, label: 'Chat' },
  { href: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
  { href: '/admin', icon: Settings, label: 'Admin' },
  { href: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { href: '/metrics', icon: BarChart3, label: 'Metrics' },
]

export function SideNav() {
  const pathname = usePathname()

  return (
    <aside className="flex w-16 flex-col items-center gap-4 border-r bg-muted/40 py-4">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? 'default' : 'ghost'}
              size="icon"
              title={item.label}
              className={cn(isActive && 'bg-primary text-primary-foreground')}
            >
              <Icon className="h-5 w-5" />
            </Button>
          </Link>
        )
      })}
    </aside>
  )
}
