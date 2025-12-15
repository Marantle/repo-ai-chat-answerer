import { useState } from 'react'
import { toast } from 'sonner'
import { createBookmark } from '@/app/bookmarks/create-actions'

export function useBookmarks() {
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set())

  const addBookmark = async (interactionId: string) => {
    if (bookmarked.has(interactionId)) return

    setBookmarked((prev) => new Set(prev).add(interactionId))

    const result = await createBookmark(interactionId)

    if (result.success) {
      toast.success('Answer bookmarked!')
    } else {
      toast.error(result.error || 'Failed to bookmark answer')
      setBookmarked((prev) => {
        const next = new Set(prev)
        next.delete(interactionId)
        return next
      })
    }
  }

  return { bookmarked, addBookmark }
}
