/**
 * Model provider abstractions for chat and embedding models.
 * Provides vendor-agnostic interfaces for LLM interactions.
 */

import type { JsonObject } from './json'

/**
 * Message role in a chat conversation.
 */
export type MessageRole = 'system' | 'user' | 'assistant'

/**
 * A single message in a chat conversation.
 */
export interface ChatMessage {
  role: MessageRole
  content: string
}

/**
 * Options for chat completion requests.
 */
export interface ChatCompletionOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
  stop?: string[]
  metadata?: JsonObject
}

/**
 * Response from a chat completion request.
 */
export interface ChatCompletionResponse {
  content: string
  finishReason: 'stop' | 'length' | 'error'
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  metadata?: JsonObject
}

/**
 * Interface for chat model providers (e.g., GPT-4, Claude).
 */
export interface ChatModel {
  /**
   * Generate a chat completion from a list of messages.
   */
  complete(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResponse>

  /**
   * Stream a chat completion. Returns an async iterator of content chunks and final usage stats.
   */
  stream(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): AsyncIterable<
    string | { usage: { promptTokens: number; completionTokens: number; totalTokens: number } }
  >
}

/**
 * Options for embedding generation requests.
 */
export interface EmbeddingOptions {
  batchSize?: number
  metadata?: JsonObject
}

/**
 * Response from an embedding generation request.
 */
export interface EmbeddingResponse {
  embeddings: number[][]
  usage?: {
    totalTokens: number
  }
  metadata?: JsonObject
}

/**
 * Interface for embedding model providers (e.g., text-embedding-3-small).
 */
export interface EmbeddingProvider {
  /**
   * Generate embeddings for a list of text inputs.
   */
  embed(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResponse>

  /**
   * Get the dimension of embeddings produced by this provider.
   */
  getDimension(): number
}

/**
 * Configuration for model providers.
 */
export interface ModelProviderConfig {
  apiKey: string
  baseUrl?: string
  organization?: string
  timeout?: number
}
