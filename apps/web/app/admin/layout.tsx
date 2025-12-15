import { PageShell } from '@/components/layouts/page-shell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      title="Repository Admin"
      description="Manage your ingested code repositories"
      maxWidth="wide"
    >
      {children}
    </PageShell>
  )
}
