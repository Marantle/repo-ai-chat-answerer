import { PageShell } from '@/components/layouts/page-shell'

export default function BookmarksLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      title="Bookmarked Answers"
      description="Your saved conversations and code references"
      maxWidth="wide"
    >
      {children}
    </PageShell>
  )
}
