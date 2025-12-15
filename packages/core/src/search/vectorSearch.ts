/**
 * Vector search implementation using pgvector.
 * Finds similar code chunks based on semantic similarity.
 */

import { prisma, searchSimilar, searchInRepo as searchInRepoQuery } from '@repo-slop/db'
import type { EmbeddingProvider } from '../modelProvider'
import type { LineRange } from '../types'

export interface SearchResult extends LineRange {
  chunkId: string
  repoId: string
  repoName: string
  filePath: string
  language: string | null
  content: string
  similarity: number
}

export interface SearchOptions {
  repoId?: string
  limit?: number
  minSimilarity?: number
  filePatterns?: string[]
}

function matchesPattern(filePath: string, pattern: string): boolean {
  const regex = new RegExp(
    '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.') + '$'
  )
  return regex.test(filePath)
}

function filterByFilePatterns<T extends { filePath: string }>(
  results: T[],
  patterns?: string[]
): T[] {
  if (!patterns || patterns.length === 0) return results
  return results.filter((row) => patterns.some((pattern) => matchesPattern(row.filePath, pattern)))
}

/**
 * Search for code chunks similar to a query using vector similarity.
 */
export async function searchSimilarChunks(
  query: string,
  embeddingProvider: EmbeddingProvider,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { repoId, limit = 8, minSimilarity = 0.0, filePatterns } = options

  const response = await embeddingProvider.embed([query])
  const queryEmbedding = response.embeddings[0]!

  const vectorString = `[${queryEmbedding.join(',')}]`

  const results = repoId
    ? await prisma.$queryRawTyped(searchInRepoQuery(vectorString, repoId, limit))
    : await prisma.$queryRawTyped(searchSimilar(vectorString, limit))

  const filteredResults = filterByFilePatterns(results, filePatterns)

  // Convert distance to similarity score (1 = identical, 0 = opposite)
  // Cosine distance ranges from 0 to 2, so similarity = 1 - (distance / 2)
  return filteredResults
    .map((row) => {
      if (row.distance === null) return null

      return {
        chunkId: row.id,
        repoId: row.repoId,
        repoName: row.repoName,
        filePath: row.filePath,
        startLine: row.startLine,
        endLine: row.endLine,
        language: row.language,
        content: row.text,
        similarity: 1 - row.distance / 2,
      }
    })
    .filter(
      (result): result is NonNullable<typeof result> =>
        result !== null && result.similarity >= minSimilarity
    )
}

/**
 * Search within a specific repository.
 */
export async function searchInRepo(
  repoId: string,
  query: string,
  embeddingProvider: EmbeddingProvider,
  limit = 5
): Promise<SearchResult[]> {
  return searchSimilarChunks(query, embeddingProvider, { repoId, limit })
}

/**
 * Get context for a question by retrieving relevant chunks.
 */
export async function getRelevantContext(
  question: string,
  embeddingProvider: EmbeddingProvider,
  options: SearchOptions = {}
): Promise<string> {
  const results = await searchSimilarChunks(question, embeddingProvider, options)

  if (results.length === 0) {
    return 'No relevant code found.'
  }

  const contextParts = results.map((result, i) => {
    const header = `[${i + 1}] ${result.filePath} (lines ${result.startLine}-${result.endLine})`
    const similarity = `Relevance: ${(result.similarity * 100).toFixed(1)}%`
    const code = result.content
    return `${header}\n${similarity}\n\`\`\`${result.language ?? ''}\n${code}\n\`\`\``
  })

  return contextParts.join('\n\n')
}
