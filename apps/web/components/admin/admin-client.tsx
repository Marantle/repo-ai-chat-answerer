'use client'

import { useState, useTransition } from 'react'
import { Trash2, RefreshCw, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteRepository } from '@/app/admin/actions'
import { getRepositories } from '@/app/admin/refresh-actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface Repository {
  id: string
  name: string
  createdAt: string
  chunkCount: number
}

interface AdminClientProps {
  initialRepositories: Repository[]
}

export function AdminClient({ initialRepositories }: AdminClientProps) {
  const [repositories, setRepositories] = useState<Repository[]>(initialRepositories)
  const [deleteRepoId, setDeleteRepoId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleRefresh = async () => {
    setRefreshing(true)
    const result = await getRepositories()
    if (result.success && result.repositories) {
      setRepositories(result.repositories)
    }
    setRefreshing(false)
  }

  const handleDelete = () => {
    if (!deleteRepoId) return

    startTransition(async () => {
      const result = await deleteRepository(deleteRepoId)

      if (result.success) {
        setRepositories((prev) => prev.filter((r) => r.id !== deleteRepoId))
        setDeleteRepoId(null)
        toast.success('Repository deleted successfully')
      } else {
        toast.error(result.error || 'Failed to delete repository')
      }
    })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div />
        <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {repositories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No repositories found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Ingest a codebase using the CLI to get started
          </p>
          <code className="block rounded bg-muted px-4 py-2 text-sm">
            pnpm ingest /path/to/repo &quot;Repository Name&quot;
          </code>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Chunks</TableHead>
                <TableHead className="text-right">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repositories.map((repo) => (
                <TableRow key={repo.id}>
                  <TableCell className="font-medium">{repo.name}</TableCell>
                  <TableCell className="text-right">{repo.chunkCount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {new Date(repo.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteRepoId(repo.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteRepoId} onOpenChange={() => setDeleteRepoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Repository</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the repository and all its chunks. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
