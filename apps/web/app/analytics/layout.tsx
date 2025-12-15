import { PageShell } from '@/components/layouts/page-shell'

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      title="Analytics Dashboard"
      description="System performance and usage insights"
      maxWidth="wide"
    >
      {children}
    </PageShell>
  )
}
