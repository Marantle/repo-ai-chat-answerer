'use client'

import { useState, useTransition } from 'react'
import { Trash2, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CodeViewer } from '@/components/code-viewer'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
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
import { deleteBookmark } from '@/app/bookmarks/actions'

interface BookmarkData {
  id: string
  title: string | null
  note: string | null
  createdAt: string
  interaction: {
    question: string
    answer: string
    repo: {
      name: string
    }
    sources: Array<{
      score: number
      chunk: {
        id: string
        filePath: string
        startLine: number
        endLine: number
        text: string
        language: string | null
      }
    }>
  }
}

interface BookmarksClientProps {
  initialBookmarks: BookmarkData[]
}

export function BookmarksClient({ initialBookmarks }: BookmarksClientProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>(initialBookmarks)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!deleteId) return

    startTransition(async () => {
      const result = await deleteBookmark(deleteId)

      if (result.success) {
        setBookmarks((prev) => prev.filter((b) => b.id !== deleteId))
        setDeleteId(null)
        toast.success('Bookmark deleted')
      } else {
        toast.error(result.error || 'Failed to delete bookmark')
      }
    })
  }

  return (
    <>
      {bookmarks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Bookmark className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No bookmarks yet</h3>
          <p className="text-sm text-muted-foreground">
            Click the bookmark icon on chat messages to save them here
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="rounded-lg border p-6 bg-card hover:shadow-md transition-shadow"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        {bookmark.interaction.repo.name}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(bookmark.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{bookmark.interaction.question}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(bookmark.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="prose prose-sm dark:prose-invert mb-4">
                  <ReactMarkdown>{bookmark.interaction.answer}</ReactMarkdown>
                </div>

                {bookmark.interaction.sources.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Sources
                    </p>
                    <div className="space-y-2">
                      {bookmark.interaction.sources.map((source) => (
                        <CodeViewer
                          key={source.chunk.id}
                          repoName={bookmark.interaction.repo.name}
                          filePath={source.chunk.filePath}
                          startLine={source.chunk.startLine}
                          endLine={source.chunk.endLine}
                          language={source.chunk.language ?? 'plaintext'}
                          content={source.chunk.text}
                          similarity={source.score * 100}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bookmark</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this bookmark. This action cannot be undone.
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
