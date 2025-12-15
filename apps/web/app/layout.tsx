import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from '@/components/error-boundary'
import { Toaster } from 'sonner'
import { SideNav } from '@/components/layouts/side-nav'

export const metadata: Metadata = {
  title: 'RepoAiChatSlop',
  description: 'Query your codebase with AI-powered search',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          <div className="flex h-screen">
            <SideNav />
            <div className="flex-1 overflow-auto">{children}</div>
          </div>
        </ErrorBoundary>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
