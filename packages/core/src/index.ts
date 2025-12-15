/**
 * Core package exports.
 * Provides model provider abstractions and utilities.
 */

export type { JsonPrimitive, JsonArray, JsonObject, JsonValue } from './json'
export { isJsonValue } from './json'

export type {
  MessageRole,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  ChatModel,
  EmbeddingOptions,
  EmbeddingResponse,
  EmbeddingProvider,
  ModelProviderConfig,
} from './modelProvider'

export { OpenAIChatModel, OpenAIEmbeddingProvider } from './providers/openai'

export { detectLanguage, isProcessableFile } from './ingest/language'
export type { LanguageInfo } from './ingest/language'

export { chunkFile, createChunkWithContext } from './ingest/chunking'
export type { ChunkOptions, CodeChunk } from './ingest/chunking'

export { walkDirectory } from './ingest/walker'
export type { WalkOptions, FileEntry } from './ingest/walker'

export { ingestRepository } from './ingest/ingest'
export type { IngestOptions, ProcessedChunk } from './ingest/ingest'

export { searchSimilarChunks, searchInRepo, getRelevantContext } from './search/vectorSearch'
export type { SearchResult, SearchOptions } from './search/vectorSearch'

export { answerQuestion, answerQuestionStream } from './rag/qa'
export type { QAOptions, QAResult } from './rag/qa'

export type { SourceReference, LineRange, CodeLocation } from './types'
