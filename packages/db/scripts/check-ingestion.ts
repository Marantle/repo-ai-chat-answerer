/**
 * Quick test to verify ingestion worked.
 */

import { prisma } from '../src/index.js'

async function main() {
  console.log('Checking ingestion results...\n')

  const repos = await prisma.repo.findMany({
    include: {
      _count: {
        select: { chunks: true },
      },
    },
  })

  console.log(`Repositories: ${repos.length}`)
  for (const repo of repos) {
    console.log(`  - ${repo.name}: ${repo._count.chunks} chunks`)
    console.log(`    Path: ${repo.rootPath}`)
  }

  const totalChunks = await prisma.chunk.count()
  console.log(`\n✂️  Total chunks in database: ${totalChunks}`)

  if (totalChunks > 0) {
    const sampleChunk = await prisma.chunk.findFirst({
      include: { repo: true },
    })

    if (sampleChunk) {
      console.log(`\nSample chunk:`)
      console.log(`   Repo: ${sampleChunk.repo.name}`)
      console.log(`   File: ${sampleChunk.filePath}`)
      console.log(`   Lines: ${sampleChunk.startLine}-${sampleChunk.endLine}`)
      console.log(`   Language: ${sampleChunk.language}`)
    }
  }

  await prisma.$disconnect()
}

main().catch(console.error)
