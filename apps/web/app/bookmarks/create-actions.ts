'use server'

import { prisma } from '@repo-slop/db'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function createBookmark(interactionId: string) {
  try {
    await prisma.bookmark.create({
      data: { interactionId },
    })

    revalidateTag('bookmarks', 'max')
    revalidatePath('/bookmarks')

    return { success: true }
  } catch (error) {
    console.error('Failed to create bookmark:', error)
    return { success: false, error: 'Failed to bookmark answer' }
  }
}
