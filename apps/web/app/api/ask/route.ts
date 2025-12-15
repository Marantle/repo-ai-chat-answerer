/**
 * POST /api/ask
 * Main QA endpoint with streaming Server-Sent Events response.
 */

import { NextRequest } from 'next/server'
import { prisma } from '@repo-slop/db'
import { OpenAIChatModel, OpenAIEmbeddingProvider, answerQuestionStream } from '@repo-slop/core'
import { checkRateLimit } from '@/lib/rate-limit'

const chatModel = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY!,
})

const embeddingProvider = new OpenAIEmbeddingProvider({
  apiKey: process.env.OPENAI_API_KEY!,
})

interface AskRequest {
  question: string
  repoId?: string
  limit?: number
  minSimilarity?: number
  filePatterns?: string[]
}

const SSE_EVENTS = {
  CHUNK: 'chunk',
  DONE: 'done',
  ERROR: 'error',
} as const

interface SourceResult {
  chunkId: string
  repoName: string
  filePath: string
  startLine: number
  endLine: number
  similarity: number
}

interface UsageData {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

const encodeSSE = (type: string, data?: Record<string, unknown>): Uint8Array => {
  return new TextEncoder().encode(`data: ${JSON.stringify({ type, ...data })}\n\n`)
}

function encodeAndEnqueueChunk(
  item: { chunk?: string; sources?: SourceResult[]; usage?: UsageData },
  controller: ReadableStreamDefaultController,
  currentSources: SourceResult[]
): SourceResult[] {
  if (!item.chunk) return currentSources

  controller.enqueue(
    encodeSSE(SSE_EVENTS.CHUNK, {
      content: item.chunk,
      ...(item.sources && { sources: item.sources }),
    })
  )

  return item.sources || currentSources
}

async function collectStreamedResponse(
  generator: AsyncIterable<{ chunk?: string; sources?: SourceResult[]; usage?: UsageData }>,
  controller: ReadableStreamDefaultController
): Promise<{ answer: string; sources: SourceResult[]; usage: UsageData | null }> {
  const chunks: string[] = []
  let sources: SourceResult[] = []
  let usage: UsageData | null = null

  for await (const item of generator) {
    if (item.chunk) {
      chunks.push(item.chunk)
      sources = encodeAndEnqueueChunk(item, controller, sources)
    }
    if (item.usage) usage = item.usage
  }

  return { answer: chunks.join(''), sources, usage }
}

interface SaveInteractionConfig {
  interactionId: string
  answer: string
  sources: SourceResult[]
  usage: UsageData | null
  durationMs: number
}

async function saveInteractionResult(config: SaveInteractionConfig): Promise<void> {
  await prisma.interaction.update({
    where: { id: config.interactionId },
    data: {
      answer: config.answer,
      durationMs: config.durationMs,
      promptTokens: config.usage?.promptTokens,
      completionTokens: config.usage?.completionTokens,
      totalTokens: config.usage?.totalTokens,
    },
  })

  if (config.sources.length > 0) {
    await prisma.interactionSource.createMany({
      data: config.sources.map((source) => ({
        interactionId: config.interactionId,
        chunkId: source.chunkId,
        score: source.similarity,
      })),
    })
  }

  // Analytics cache updates automatically via 10-second time-based revalidation
  // Manual refresh button provides instant updates when needed
}

async function cleanupFailedInteraction(interactionId: string): Promise<void> {
  await prisma.interaction.delete({ where: { id: interactionId } }).catch(() => {
    // Ignore cleanup errors
  })
}

function validateQuestion(question: unknown): Response | null {
  if (!question || typeof question !== 'string') {
    return new Response(JSON.stringify({ error: 'Question is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (question.trim().length < 3) {
    return new Response(JSON.stringify({ error: 'Question must be at least 3 characters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (question.length > 1000) {
    return new Response(JSON.stringify({ error: 'Question must be less than 1000 characters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return null
}

function validateFilePatterns(filePatterns: unknown): Response | null {
  if (
    filePatterns &&
    (!Array.isArray(filePatterns) || filePatterns.some((p) => typeof p !== 'string'))
  ) {
    return new Response(JSON.stringify({ error: 'File patterns must be an array of strings' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}

function checkRateLimitResponse(request: NextRequest): Response | null {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const rateLimit = checkRateLimit(ip, { maxRequests: 10, windowMs: 60 * 1000 })

  if (!rateLimit.success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Please try again later.',
        resetAt: rateLimit.reset,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.reset),
        },
      }
    )
  }
  return null
}

async function getTargetRepoId(requestedRepoId?: string): Promise<string | null> {
  return requestedRepoId ?? (await prisma.repo.findFirst())?.id ?? null
}

async function createInteraction(repoId: string, question: string) {
  return prisma.interaction.create({
    data: {
      repoId,
      question,
      answer: '',
      modelName: 'gpt-4o-mini',
      durationMs: 0,
    },
  })
}

function createStreamResponse(
  interaction: { id: string },
  question: string,
  config: { repoId?: string; limit: number; minSimilarity: number; filePatterns?: string[] }
): Response {
  const startTime = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = answerQuestionStream(question, chatModel, embeddingProvider, config)
        const { answer, sources, usage } = await collectStreamedResponse(generator, controller)

        await saveInteractionResult({
          interactionId: interaction.id,
          answer,
          sources,
          usage,
          durationMs: Date.now() - startTime,
        })

        controller.enqueue(encodeSSE(SSE_EVENTS.DONE, { interactionId: interaction.id }))
        controller.close()
      } catch (error) {
        await cleanupFailedInteraction(interaction.id)
        controller.enqueue(
          encodeSSE(SSE_EVENTS.ERROR, {
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

async function parseAndValidateBody(
  request: NextRequest
): Promise<{ error: Response } | { body: AskRequest }> {
  const body = (await request.json()) as AskRequest
  const { question, filePatterns } = body

  const questionError = validateQuestion(question)
  if (questionError) return { error: questionError }

  const patternError = validateFilePatterns(filePatterns)
  if (patternError) return { error: patternError }

  return { body }
}

async function prepareRequestParams(
  body: AskRequest
): Promise<
  | { error: Response }
  | {
      params: {
        targetRepoId: string
        question: string
        repoId?: string
        limit: number
        minSimilarity: number
        filePatterns?: string[]
      }
    }
> {
  const { question, repoId, limit = 5, minSimilarity = 0.5, filePatterns } = body

  const targetRepoId = await getTargetRepoId(repoId)
  if (!targetRepoId) {
    return {
      error: new Response(JSON.stringify({ error: 'No repositories available' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  return { params: { targetRepoId, question, repoId, limit, minSimilarity, filePatterns } }
}

async function validateAndPrepareRequest(
  request: NextRequest
): Promise<
  | { error: Response }
  | {
      params: {
        targetRepoId: string
        question: string
        repoId?: string
        limit: number
        minSimilarity: number
        filePatterns?: string[]
      }
    }
> {
  const rateLimitError = checkRateLimitResponse(request)
  if (rateLimitError) return { error: rateLimitError }

  const bodyResult = await parseAndValidateBody(request)
  if ('error' in bodyResult) return bodyResult

  return prepareRequestParams(bodyResult.body)
}

export async function POST(request: NextRequest) {
  try {
    const result = await validateAndPrepareRequest(request)
    if ('error' in result) return result.error

    const { targetRepoId, question, ...config } = result.params
    const interaction = await createInteraction(targetRepoId, question)
    return createStreamResponse(interaction, question, config)
  } catch (error) {
    // Log error (in production, use structured logger like winston/pino)
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error in /api/ask:', error)
    }
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
