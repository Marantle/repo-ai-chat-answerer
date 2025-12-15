import { prisma } from '@repo-slop/db'
import { AdminClient } from '@/components/admin/admin-client'
import { unstable_cache } from 'next/cache'

interface Repository {
  id: string
  name: string
  createdAt: string
  chunkCount: number
}

const getRepositories = unstable_cache(
  async (): Promise<Repository[]> => {
    const repos = await prisma.repo.findMany({
      include: {
        _count: {
          select: { chunks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return repos.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt.toISOString(),
      chunkCount: r._count.chunks,
    }))
  },
  ['repositories'],
  {
    tags: ['repositories'],
    revalidate: 60,
  }
)

export default async function AdminPage() {
  const repositories = await getRepositories()
  return <AdminClient initialRepositories={repositories} />
}
