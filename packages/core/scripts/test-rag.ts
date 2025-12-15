/**
 * Test RAG question answering pipeline.
 */

import {
  OpenAIChatModel,
  OpenAIEmbeddingProvider,
  answerQuestion,
  answerQuestionStream,
  type SourceReference,
} from '../src/index'

const chatModel = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY!,
})

const embeddingProvider = new OpenAIEmbeddingProvider({
  apiKey: process.env.OPENAI_API_KEY!,
})

async function testBasicQA() {
  console.log('Testing Basic QA')
  console.log('='.repeat(50))
  console.log()

  const question = 'How does the OpenAI embedding provider work?'
  console.log(`Question: ${question}`)
  console.log()

  const result = await answerQuestion(question, chatModel, embeddingProvider, {
    limit: 3,
    minSimilarity: 0.5,
  })

  console.log('Answer:')
  console.log(result.answer)
  console.log()
  console.log('Sources:')
  result.sources.forEach((source: SourceReference, i: number) => {
    console.log(
      `${i + 1}. ${source.filePath} (lines ${source.startLine}-${source.endLine}) - ${(source.similarity * 100).toFixed(1)}% relevant`
    )
  })
  console.log()
}

async function testStreamingQA() {
  console.log('Testing Streaming QA')
  console.log('='.repeat(50))
  console.log()

  const question = 'Explain how file chunking works in the ingestion pipeline'
  console.log(`Question: ${question}`)
  console.log()
  console.log('Answer (streaming):')

  let sources: SourceReference[] = []
  for await (const { chunk, sources: chunkSources } of answerQuestionStream(
    question,
    chatModel,
    embeddingProvider,
    {
      limit: 3,
      minSimilarity: 0.5,
    }
  )) {
    if (chunk) process.stdout.write(chunk)
    if (chunkSources) {
      sources = chunkSources
    }
  }

  console.log()
  console.log()
  console.log('Sources:')
  sources.forEach((source: SourceReference, i: number) => {
    console.log(
      `${i + 1}. ${source.filePath} (lines ${source.startLine}-${source.endLine}) - ${(source.similarity * 100).toFixed(1)}% relevant`
    )
  })
  console.log()
}

async function main() {
  try {
    await testBasicQA()
    await testStreamingQA()
    console.log('RAG QA test complete!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
