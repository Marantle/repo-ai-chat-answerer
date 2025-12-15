/**
 * Main ingestion orchestrator.
 * Walks directory, chunks files, and prepares for embedding.
 */

import { readFile } from 'node:fs/promises'
import { detectLanguage } from './language'
import { chunkFile, type CodeChunk } from './chunking'
import { walkDirectory, type WalkOptions } from './walker'

export interface IngestOptions extends WalkOptions {
  chunkSize?: number
  chunkOverlap?: number
}

export interface ProcessedChunk extends CodeChunk {
  filePath: string
  relativePath: string
  hash: string
}

async function chunkFileFromDisk(
  file: { path: string; relativePath: string },
  options: Partial<IngestOptions>
): Promise<ProcessedChunk[]> {
  const content = await readFile(file.path, 'utf-8')
  const langInfo = detectLanguage(file.path)

  if (!langInfo) return []

  const chunks = chunkFile(content, langInfo.language, {
    maxChunkSize: options.chunkSize ?? 100,
    overlap: options.chunkOverlap ?? 10,
  })

  return chunks.map((chunk) => ({
    ...chunk,
    filePath: file.path,
    relativePath: file.relativePath,
    hash: generateHash(chunk.content),
  }))
}

/**
 * Process a repository and extract all code chunks.
 */
export async function ingestRepository(
  repoPath: string,
  options: Partial<IngestOptions> = {}
): Promise<ProcessedChunk[]> {
  console.log(`Scanning repository: ${repoPath}`)

  const files = await walkDirectory(repoPath, options)
  console.log(`Found ${files.length} processable files`)

  const allChunks: ProcessedChunk[] = []

  for (const file of files) {
    try {
      const chunks = await chunkFileFromDisk(file, options)
      allChunks.push(...chunks)
    } catch (error) {
      console.warn(`Error processing ${file.relativePath}:`, error)
    }
  }

  console.log(`✂️  Created ${allChunks.length} chunks from ${files.length} files`)

  return allChunks
}

/**
 * Simple hash function for deduplication.
 */
function generateHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}
