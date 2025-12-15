/**
 * Core domain types - SINGLE SOURCE OF TRUTH for shared type definitions.
 * Import these instead of redefining inline types.
 */

/**
 * Represents a range of lines in a source file.
 * Used across chunking, search, QA, and evaluation.
 */
export interface LineRange {
  startLine: number
  endLine: number
}

/**
 * Reference to a specific chunk of code in the repository.
 * Used for citations and source tracking.
 */
export interface SourceReference extends LineRange {
  chunkId: string
  repoName: string
  filePath: string
  similarity: number
}

/**
 * Location of code in the repository with language metadata.
 * Used for chunking and code representation.
 */
export interface CodeLocation extends LineRange {
  filePath: string
  language: string
}
