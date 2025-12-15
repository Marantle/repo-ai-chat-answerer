/**
 * Test vector search functionality.
 */

import { prisma } from '@repo-slop/db'
import { OpenAIEmbeddingProvider } from '../src/providers/openai'
import { searchSimilarChunks, getRelevantContext } from '../src/search/vectorSearch'

async function main() {
  console.log('Testing Vector Search')
  console.log('====================\n')

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment')
  }

  const embeddingProvider = new OpenAIEmbeddingProvider({ apiKey }, 'text-embedding-3-small', 1536)

  const queries = [
    'How does OpenAI embedding work?',
    'File chunking and language detection',
    'Database schema and models',
  ]

  for (const query of queries) {
    console.log(`\nQuery: "${query}"`)
    console.log('─'.repeat(60))

    const results = await searchSimilarChunks(query, embeddingProvider, {
      limit: 3,
    })

    if (results.length === 0) {
      console.log('No results found.')
      continue
    }

    results.forEach(
      (
        result: {
          filePath: string
          startLine: number
          endLine: number
          similarity: number
          language: string | null
          content: string
        },
        i: number
      ) => {
        console.log(`\n${i + 1}. ${result.filePath} (lines ${result.startLine}-${result.endLine})`)
        console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`)
        console.log(`   Language: ${result.language ?? 'unknown'}`)
        console.log(`   Preview: ${result.content.slice(0, 100)}...`)
      }
    )
  }

  console.log('\n\nTesting Context Generation')
  console.log('─'.repeat(60))

  const context = await getRelevantContext('How to implement embeddings?', embeddingProvider, {
    limit: 2,
  })

  console.log(context)

  await prisma.$disconnect()
  console.log('\nVector search test complete!')
}

main().catch(console.error)
