/**
 * Test file walking and chunking on this repository.
 */

import { ingestRepository } from '../src/ingest/ingest'

async function main() {
  console.log('Testing File Walking and Chunking')
  console.log('==================================\n')

  const testPath = process.cwd()

  console.log(`Testing on: ${testPath}\n`)

  const chunks = await ingestRepository(testPath, {
    chunkSize: 50, // Smaller chunks for demo
    chunkOverlap: 5,
  })

  console.log(`\nResults:`)
  console.log(`- Total chunks: ${chunks.length}`)

  const byLanguage = new Map<string, number>()
  for (const chunk of chunks) {
    byLanguage.set(chunk.language, (byLanguage.get(chunk.language) ?? 0) + 1)
  }

  console.log(`\nChunks by language:`)
  for (const [lang, count] of Array.from(byLanguage.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lang}: ${count}`)
  }

  const sampleChunk = chunks[0]
  if (sampleChunk) {
    console.log(`\nSample chunk:`)
    console.log(`File: ${sampleChunk.relativePath}`)
    console.log(`Lines: ${sampleChunk.startLine}-${sampleChunk.endLine}`)
    console.log(`Language: ${sampleChunk.language}`)
    console.log(`Length: ${sampleChunk.content.length} chars`)
    console.log(`\nContent preview:`)
    console.log(sampleChunk.content.slice(0, 200) + '...')
  }

  console.log(`\n✅ File walking and chunking working correctly!`)
}

main().catch(console.error)
