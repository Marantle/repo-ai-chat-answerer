import { ChatInterface } from '@/components/chat-interface'
import { prisma } from '@repo-slop/db'
import { unstable_cache } from 'next/cache'

const getRepositories = unstable_cache(
  async () => {
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
      chunkCount: r._count.chunks,
    }))
  },
  ['repositories'],
  {
    tags: ['repositories'],
    revalidate: 3600,
  }
)

export default async function Home() {
  const repositories = await getRepositories()

  return <ChatInterface repositories={repositories} />
}
