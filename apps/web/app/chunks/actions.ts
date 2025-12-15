'use server'

import { prisma } from '@repo-slop/db'

export async function getChunkContent(chunkId: string) {
  try {
    const chunk = await prisma.chunk.findUnique({
      where: { id: chunkId },
      select: { text: true, language: true },
    })

    if (!chunk) {
      return { success: false, error: 'Chunk not found' }
    }

    return {
      success: true,
      content: chunk.text,
      language: chunk.language || undefined,
    }
  } catch (error) {
    console.error('Failed to get chunk content:', error)
    return { success: false, error: 'Failed to load code preview' }
  }
}
