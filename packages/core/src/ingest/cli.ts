/**
 * CLI for ingesting repositories into the database.
 * Combines Tasks 6 and 7: Ingestion + Embedding generation.
 */

import { prisma } from '@repo-slop/db'
import { OpenAIEmbeddingProvider } from '../providers/openai'
import { ingestRepository } from './ingest'
import { createChunkWithContext } from './chunking'

interface CliOptions {
  repoPath: string
  repoName?: string
  batchSize?: number
}

/**
 * Main ingestion pipeline.
 */
export async function runIngestion(options: CliOptions): Promise<void> {
  const { repoPath, repoName, batchSize = 50 } = options

  console.log('Starting ingestion pipeline...\n')

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment')
  }

  const embeddingProvider = new OpenAIEmbeddingProvider({ apiKey }, 'text-embedding-3-small', 1536)

  console.log(`Repository: ${repoName ?? repoPath}`)
  const repo = await prisma.repo.upsert({
    where: { rootPath: repoPath },
    update: { updatedAt: new Date() },
    create: {
      name: repoName ?? repoPath.split(/[/\\]/).pop() ?? 'unknown',
      rootPath: repoPath,
    },
  })
  console.log(`✓ Repo ID: ${repo.id}\n`)

  console.log('Scanning and chunking files...')
  const chunks = await ingestRepository(repoPath, {
    chunkSize: 60,
    chunkOverlap: 10,
  })

  if (chunks.length === 0) {
    console.log('No chunks found. Exiting.')
    return
  }

  console.log(`\nCleaning up old chunks...`)
  const deleted = await prisma.chunk.deleteMany({
    where: { repoId: repo.id },
  })
  console.log(`✓ Deleted ${deleted.count} old chunks`)

  console.log(`\nGenerating embeddings for ${chunks.length} chunks...`)
  const chunksWithEmbeddings: Array<{ chunk: typeof chunks[0]; embedding: number[] }> = []

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const texts = await Promise.all(
      batch.map(async (chunk) => {
        const lines = chunk.content.split('\n')
        return createChunkWithContext(
          {
            lines,
            startLine: 1,
            endLine: lines.length,
            language: chunk.language,
          },
          chunk.relativePath
        )
      })
    )

    console.log(
      `  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}...`
    )

    const response = await embeddingProvider.embed(texts)
    
    // Only store chunks that got embeddings (some may be skipped if oversized)
    for (let j = 0; j < Math.min(batch.length, response.embeddings.length); j++) {
      chunksWithEmbeddings.push({
        chunk: batch[j]!,
        embedding: response.embeddings[j]!,
      })
    }

    // Rate limiting: wait a bit between batches
    if (i + batchSize < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  console.log(`✓ Generated ${chunksWithEmbeddings.length} embeddings\n`)

  // Step 5: Store chunks with embeddings in database
  console.log('Storing chunks in database...')

  for (let i = 0; i < chunksWithEmbeddings.length; i++) {
    const { chunk, embedding } = chunksWithEmbeddings[i]!

    // Convert embedding to pgvector format: [1,2,3]
    const vectorString = `[${embedding.join(',')}]`

    await prisma.$executeRaw`
      INSERT INTO "chunks" (
        "id",
        "repoId",
        "filePath",
        "startLine",
        "endLine",
        "kind",
        "language",
        "text",
        "embedding",
        "createdAt"
      ) VALUES (
        gen_random_uuid(),
        ${repo.id},
        ${chunk.relativePath},
        ${chunk.startLine},
        ${chunk.endLine},
        'CODE',
        ${chunk.language},
        ${chunk.content},
        ${vectorString}::vector(1536),
        NOW()
      )
    `

    if ((i + 1) % 100 === 0 || i === chunksWithEmbeddings.length - 1) {
      console.log(`  Stored ${i + 1}/${chunksWithEmbeddings.length} chunks`)
    }
  }

  console.log(`\nIngestion complete!`)
  console.log(`   Repository: ${repo.name}`)
  console.log(`   Chunks: ${chunksWithEmbeddings.length}`)
  console.log(`   Ready for queries!\n`)
}

/**
 * CLI entry point.
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: pnpm ingest <repo-path> [repo-name]')
    console.log('\nExample:')
    console.log('  pnpm ingest /path/to/my-project')
    console.log('  pnpm ingest /path/to/my-project "My Project"')
    process.exit(1)
  }

  const repoPath = args[0]!
  const repoName = args[1]

  try {
    await runIngestion({ repoPath, repoName })
  } catch (error) {
    console.error('Ingestion failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly (not when imported)
if (require.main === module) {
  main()
}
