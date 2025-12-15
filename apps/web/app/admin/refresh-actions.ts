'use server'

import { prisma } from '@repo-slop/db'

export async function getRepositories() {
  try {
    const repos = await prisma.repo.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: { chunks: true },
        },
      },
    })

    return {
      success: true,
      repositories: repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        createdAt: repo.createdAt.toISOString(),
        chunkCount: repo._count.chunks,
      })),
    }
  } catch (error) {
    console.error('Failed to fetch repositories:', error)
    return { success: false, error: 'Failed to fetch repositories' }
  }
}
