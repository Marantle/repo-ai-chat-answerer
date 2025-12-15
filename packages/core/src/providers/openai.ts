/**
 * OpenAI implementation of ChatModel and EmbeddingProvider interfaces.
 */

import type {
  ChatModel,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingProvider,
  EmbeddingResponse,
  ModelProviderConfig,
} from '../modelProvider'

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIChatCompletionRequest {
  model: string
  messages: OpenAIMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  stop?: string[]
  stream?: boolean
  stream_options?: {
    include_usage?: boolean
  }
}

interface OpenAIChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface OpenAIEmbeddingRequest {
  model: string
  input: string | string[]
  encoding_format?: 'float' | 'base64'
}

interface OpenAIEmbeddingResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

interface StreamUsage {
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

type StreamContent = string | StreamUsage | null

interface StreamChunk {
  choices?: Array<{
    delta?: {
      content?: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * OpenAI chat model implementation.
 */
export class OpenAIChatModel implements ChatModel {
  private readonly config: ModelProviderConfig
  private readonly model: string
  private readonly baseUrl: string

  constructor(config: ModelProviderConfig, model = 'gpt-4o') {
    this.config = config
    this.model = model
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1'
  }

  /**
   * Build the OpenAI chat completion request body.
   */
  private buildRequest(
    messages: ChatMessage[],
    opts: ChatCompletionOptions = {},
    stream = false
  ): OpenAIChatCompletionRequest {
    const base: OpenAIChatCompletionRequest = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      top_p: opts.topP,
    }
    if (stream) base.stream_options = { include_usage: true }
    return base
  }

  /**
   * Build headers for OpenAI API requests.
   */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
      ...(this.config.organization && {
        'OpenAI-Organization': this.config.organization,
      }),
    }
  }

  /**
   * Make an OpenAI API request with error handling.
   */
  private async makeRequest(endpoint: string, body: unknown): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      signal: this.config.timeout ? AbortSignal.timeout(this.config.timeout) : undefined,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`)
    }

    return response
  }
  private mapFinishReason(reason: string | undefined): 'stop' | 'length' | 'error' {
    if (reason === 'stop') return 'stop'
    if (reason === 'length') return 'length'
    return 'error'
  }

  async complete(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    const request = this.buildRequest(messages, options, false)
    const response = await this.makeRequest('/chat/completions', request)
    const data = (await response.json()) as OpenAIChatCompletionResponse

    return {
      content: data.choices[0]?.message.content ?? '',
      finishReason: this.mapFinishReason(data.choices[0]?.finish_reason),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      metadata: {
        model: data.model,
        id: data.id,
      },
    }
  }

  private isValidStreamLine(trimmed: string): boolean {
    return !!trimmed && trimmed !== 'data: [DONE]' && trimmed.startsWith('data: ')
  }

  private processStreamLines(lines: string[]): string[] {
    return lines.map((line) => line.trim()).filter((trimmed) => this.isValidStreamLine(trimmed))
  }

  private processRemainingBuffer(buffer: string): string | null {
    const remaining = buffer.trim()
    return remaining && this.isValidStreamLine(remaining) ? remaining : null
  }

  private async *readStream(
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): AsyncIterable<string> {
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        yield* this.processStreamLines(lines)
      }

      const remaining = this.processRemainingBuffer(buffer)
      if (remaining) yield remaining
    } finally {
      reader.releaseLock()
    }
  }

  private mapUsage(usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }): StreamUsage {
    return {
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
    }
  }

  private hasContent(json: StreamChunk): boolean {
    return Boolean(json.choices?.[0]?.delta?.content)
  }

  private getUsageOrNull(json: StreamChunk): StreamUsage | null {
    return json.usage ? this.mapUsage(json.usage) : null
  }

  private extractStreamContent(json: StreamChunk): StreamContent {
    if (this.hasContent(json)) return json.choices![0].delta!.content!
    return this.getUsageOrNull(json)
  }

  private parseStreamLine(line: string): StreamContent {
    try {
      const json = JSON.parse(line.slice(6)) as StreamChunk
      return this.extractStreamContent(json)
    } catch {
      return null
    }
  }

  async *stream(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): AsyncIterable<
    string | { usage: { promptTokens: number; completionTokens: number; totalTokens: number } }
  > {
    const request = this.buildRequest(messages, options, true)
    const response = await this.makeRequest('/chat/completions', request)

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()

    for await (const line of this.readStream(reader)) {
      const parsed = this.parseStreamLine(line)
      if (parsed) yield parsed
    }
  }
}

/**
 * OpenAI embedding provider implementation.
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly config: ModelProviderConfig
  private readonly model: string
  private readonly dimension: number
  private readonly baseUrl: string

  constructor(config: ModelProviderConfig, model = 'text-embedding-3-small', dimension = 1536) {
    this.config = config
    this.model = model
    this.dimension = dimension
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1'
  }

  private buildEmbeddingRequest(batch: string[]): OpenAIEmbeddingRequest {
    return {
      model: this.model,
      input: batch,
      encoding_format: 'float',
    }
  }

  private buildEmbeddingHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    }

    if (this.config.organization) {
      headers['OpenAI-Organization'] = this.config.organization
    }

    return headers
  }

  private extractEmbeddings(data: OpenAIEmbeddingResponse): number[][] {
    const sortedData = [...data.data].sort((a, b) => a.index - b.index)
    return sortedData.map((d) => d.embedding)
  }

  private async fetchEmbeddings(batch: string[]): Promise<OpenAIEmbeddingResponse> {
    const request = this.buildEmbeddingRequest(batch)
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.buildEmbeddingHeaders(),
      body: JSON.stringify(request),
      signal: this.config.timeout ? AbortSignal.timeout(this.config.timeout) : undefined,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`)
    }

    return (await response.json()) as OpenAIEmbeddingResponse
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 2.5)
  }

  private async processBatch(batch: string[]): Promise<{ embeddings: number[][]; tokens: number }> {
    const data = await this.fetchEmbeddings(batch)
    return {
      embeddings: this.extractEmbeddings(data),
      tokens: data.usage.total_tokens,
    }
  }

  private filterValidTexts(texts: string[], maxTokens: number): string[] {
    return texts.filter((text) => {
      const tokens = this.estimateTokens(text)
      if (tokens > maxTokens) {
        console.warn(
          `⚠️  Skipping oversized text: ${tokens} tokens (${text.length} chars) exceeds ${maxTokens} limit`
        )
        return false
      }
      return true
    })
  }

  private createBatches(texts: string[], maxBatchTokens: number): string[][] {
    const batches: string[][] = []
    let currentBatch: string[] = []
    let currentTokens = 0

    for (const text of texts) {
      const tokens = this.estimateTokens(text)
      if (currentBatch.length > 0 && currentTokens + tokens > maxBatchTokens) {
        batches.push(currentBatch)
        currentBatch = []
        currentTokens = 0
      }
      currentBatch.push(text)
      currentTokens += tokens
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch)
    }

    return batches
  }

  private async processAllBatches(batches: string[][]): Promise<{ embeddings: number[][]; totalTokens: number }> {
    let allEmbeddings: number[][] = []
    let totalTokens = 0

    for (const batch of batches) {
      const result = await this.processBatch(batch)
      allEmbeddings = [...allEmbeddings, ...result.embeddings]
      totalTokens += result.tokens
    }

    return { embeddings: allEmbeddings, totalTokens }
  }

  async embed(texts: string[]): Promise<EmbeddingResponse> {
    const validTexts = this.filterValidTexts(texts, 3500)
    const batches = this.createBatches(validTexts, 4000)
    const { embeddings, totalTokens } = await this.processAllBatches(batches)
    return { embeddings, usage: { totalTokens } }
  }

  getDimension(): number {
    return this.dimension
  }
}
