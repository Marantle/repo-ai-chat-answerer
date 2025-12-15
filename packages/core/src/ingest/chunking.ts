/**
 * Code chunking logic for breaking files into manageable pieces.
 */

import type { LineRange } from '../types'

export interface ChunkOptions {
  maxChunkSize: number // Maximum lines per chunk
  overlap: number // Number of lines to overlap between chunks
  minChunkSize: number // Minimum lines per chunk
}

export interface CodeChunk extends LineRange {
  content: string
  language: string
}

const DEFAULT_OPTIONS: ChunkOptions = {
  maxChunkSize: 100, // 100 lines seems to work well, don't overthink it
  overlap: 10,
  minChunkSize: 5,
}

/**
 * Split file content into overlapping chunks.
 */
function shouldIncludeChunk(chunkSize: number, minSize: number, isLastChunk: boolean): boolean {
  return chunkSize >= minSize || isLastChunk
}

interface ChunkPosition {
  current: number
  maxSize: number
  overlap: number
  minSize: number
  totalLines: number
  chunksCreated: number
}

function calculateNextPosition(pos: ChunkPosition): number {
  const nextPos = pos.current + pos.maxSize - pos.overlap

  // Prevent infinite loop by jumping to end if stuck
  if (nextPos <= pos.chunksCreated * pos.minSize && nextPos < pos.totalLines) {
    return pos.current + pos.maxSize
  }

  return nextPos
}

function createChunk(
  lines: string[],
  startLine: number,
  endLine: number,
  language: string
): CodeChunk {
  return {
    content: lines.slice(startLine, endLine).join('\n'),
    startLine: startLine + 1,
    endLine,
    language,
  }
}

function shouldReturnSingleChunk(lineCount: number, maxChunkSize: number): boolean {
  return lineCount <= maxChunkSize
}

interface ProcessChunkConfig {
  lines: string[]
  currentLine: number
  maxChunkSize: number
  minChunkSize: number
  language: string
}

interface ProcessChunkResult {
  chunk: CodeChunk | null
  size: number
  isLast: boolean
}

function processChunk(config: ProcessChunkConfig): ProcessChunkResult {
  const { lines, currentLine, maxChunkSize, minChunkSize, language } = config
  const endLine = Math.min(currentLine + maxChunkSize, lines.length)
  const chunkSize = endLine - currentLine
  const isLastChunk = endLine === lines.length

  if (shouldIncludeChunk(chunkSize, minChunkSize, isLastChunk)) {
    return {
      chunk: createChunk(lines, currentLine, endLine, language),
      size: chunkSize,
      isLast: isLastChunk,
    }
  }

  return { chunk: null, size: chunkSize, isLast: isLastChunk }
}

function createSingleChunk(lines: string[], language: string): CodeChunk[] {
  return [createChunk(lines, 0, lines.length, language)]
}

function processAllChunks(lines: string[], opts: ChunkOptions, language: string): CodeChunk[] {
  const chunks: CodeChunk[] = []
  let currentLine = 0

  while (currentLine < lines.length) {
    const result = processChunk({
      lines,
      currentLine,
      maxChunkSize: opts.maxChunkSize,
      minChunkSize: opts.minChunkSize,
      language,
    })

    if (result.chunk) chunks.push(result.chunk)

    currentLine = calculateNextPosition({
      current: currentLine,
      maxSize: opts.maxChunkSize,
      overlap: opts.overlap,
      minSize: opts.minChunkSize,
      totalLines: lines.length,
      chunksCreated: chunks.length,
    })
  }

  return chunks
}

export function chunkFile(
  content: string,
  language: string,
  options: Partial<ChunkOptions> = {}
): CodeChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const lines = content.split('\n')

  if (lines.length === 0) return []
  if (shouldReturnSingleChunk(lines.length, opts.maxChunkSize)) {
    return createSingleChunk(lines, language)
  }

  return processAllChunks(lines, opts, language)
}

interface ChunkContext extends LineRange {
  lines: string[]
  language: string
}

/**
 * Create a chunk with surrounding context for better embeddings.
 */
export function createChunkWithContext(context: ChunkContext, filePath: string): string {
  const { lines, startLine, endLine, language } = context
  const chunkLines = lines.slice(startLine - 1, endLine)
  const header = `File: ${filePath} (lines ${startLine}-${endLine})\nLanguage: ${language}\n\n`
  return header + chunkLines.join('\n')
}
