'use server'

import { prisma } from '@repo-slop/db'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function deleteBookmark(bookmarkId: string) {
  try {
    await prisma.bookmark.delete({
      where: { id: bookmarkId },
    })

    revalidateTag('bookmarks', 'max')
    revalidatePath('/bookmarks')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete bookmark:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete bookmark',
    }
  }
}
