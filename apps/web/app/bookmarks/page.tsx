import { prisma } from '@repo-slop/db'
import { BookmarksClient } from '@/components/bookmarks/bookmarks-client'
import { unstable_cache } from 'next/cache'

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

const getBookmarks = unstable_cache(
  async (): Promise<BookmarkData[]> => {
    const bookmarks = await prisma.bookmark.findMany({
      include: {
        interaction: {
          include: {
            repo: true,
            sources: {
              include: {
                chunk: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return bookmarks.map((b) => ({
      id: b.id,
      title: b.title,
      note: b.note,
      createdAt: b.createdAt.toISOString(),
      interaction: {
        question: b.interaction.question,
        answer: b.interaction.answer,
        repo: {
          name: b.interaction.repo.name,
        },
        sources: b.interaction.sources.map((s) => ({
          score: s.score,
          chunk: {
            id: s.chunk.id,
            filePath: s.chunk.filePath,
            startLine: s.chunk.startLine,
            endLine: s.chunk.endLine,
            text: s.chunk.text,
            language: s.chunk.language,
          },
        })),
      },
    }))
  },
  ['bookmarks'],
  {
    tags: ['bookmarks'],
    revalidate: 60,
  }
)

export default async function BookmarksPage() {
  const bookmarks = await getBookmarks()
  return <BookmarksClient initialBookmarks={bookmarks} />
}
