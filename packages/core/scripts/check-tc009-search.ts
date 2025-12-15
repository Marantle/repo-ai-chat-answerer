import { OpenAIEmbeddingProvider } from '../src/providers/openai'
import { searchSimilarChunks } from '../src/search/vectorSearch'

async function main() {
  const embeddingProvider = new OpenAIEmbeddingProvider({
    apiKey: process.env.OPENAI_API_KEY!,
  })

  const db = (await import('@repo-slop/db')).prisma
  const repo = await db.repo.findFirst({
    where: { name: 'AI Codebase Copilot Monorepo' },
  })

  if (!repo) {
    console.error('Repo not found')
    process.exit(1)
  }

  const results = await searchSimilarChunks('How does feedback work?', embeddingProvider, {
    repoId: repo.id,
    limit: 8,
  })

  console.log('\nTop 8 results for "How does feedback work?":\n')
  for (const result of results) {
    const match = result.filePath === 'apps/web/app/api/feedback/route.ts' ? '✓' : '✗'
    console.log(`${match} ${result.filePath} (${(result.similarity * 100).toFixed(1)}%)`)
  }

  process.exit(0)
}

main()
