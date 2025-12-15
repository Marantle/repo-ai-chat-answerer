import { Database } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface RepoUsage {
  repoId: string
  repoName: string
  queryCount: number
  avgLatency: number
  totalTokens: number
}

interface RepoUsageProps {
  repos: RepoUsage[]
}

export function RepoUsage({ repos }: RepoUsageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository Usage</CardTitle>
        <CardDescription>Query distribution by repository</CardDescription>
      </CardHeader>
      <CardContent>
        {repos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet</p>
        ) : (
          <div className="space-y-4">
            {repos.map((repo) => (
              <div key={repo.repoId} className="border-b pb-3 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{repo.repoName}</span>
                  </div>
                  <span className="text-sm font-bold">{repo.queryCount} queries</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground ml-6">
                  <span>Avg: {repo.avgLatency}ms</span>
                  <span>{repo.totalTokens.toLocaleString()} tokens</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
