'use server'

import { prisma } from '@repo-slop/db'
import { revalidatePath, revalidateTag } from 'next/cache'

// FIXME: This cascades deletes to chunks/interactions via Prisma, might be slow for large repos
export async function deleteRepository(repoId: string) {
  try {
    await prisma.repo.delete({
      where: { id: repoId },
    })

    revalidateTag('repositories', 'max')
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete repository:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete repository',
    }
  }
}
