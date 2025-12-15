import { PageShell } from '@/components/layouts/page-shell'

export default function MetricsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      title="Metrics Dashboard"
      description="System usage and performance statistics"
      maxWidth="wide"
    >
      {children}
    </PageShell>
  )
}
