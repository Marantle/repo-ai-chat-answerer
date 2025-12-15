/**
 * Test script for model provider abstractions.
 * Tests OpenAI chat and embedding providers.
 */

import { OpenAIChatModel, OpenAIEmbeddingProvider } from '../src/index'

async function testChatModel() {
  console.log('\nTesting OpenAI Chat Model...')

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.log('⚠️  OPENAI_API_KEY not set - skipping chat test')
    return
  }

  const chatModel = new OpenAIChatModel({ apiKey }, 'gpt-4o-mini')

  console.log('→ Testing completion...')
  const response = await chatModel.complete([
    { role: 'user', content: 'Say "Hello from AI Copilot test!" and nothing else.' },
  ])

  console.log(`✓ Response: ${response.content}`)
  console.log(`✓ Finish reason: ${response.finishReason}`)
  console.log(`✓ Tokens used: ${response.usage?.totalTokens ?? 0}`)

  console.log('→ Testing streaming...')
  process.stdout.write('✓ Stream: ')
  let tokens = null
  for await (const chunk of chatModel.stream([{ role: 'user', content: 'Count to 5 slowly: 1' }])) {
    if (typeof chunk === 'string') {
      process.stdout.write(chunk)
    } else {
      tokens = chunk.usage
    }
  }
  console.log(`\n✓ Tokens: ${tokens?.totalTokens ?? 0}\n`)
}

async function testEmbeddingProvider() {
  console.log('Testing OpenAI Embedding Provider...')

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.log('⚠️  OPENAI_API_KEY not set - skipping embedding test')
    return
  }

  const embeddingProvider = new OpenAIEmbeddingProvider({ apiKey }, 'text-embedding-3-small', 1536)

  console.log(`→ Embedding dimension: ${embeddingProvider.getDimension()}`)

  const codeChunks = [
    'function authenticateUser(username, password) { /* login logic */ }',
    'const loginHandler = async (req, res) => { /* handles user sign in */ }',
    'class DatabaseConnection { /* manages postgres connection */ }',
  ]

  const userQuestion = 'How does user authentication work?'

  console.log(`\n→ Generating embeddings for ${codeChunks.length} code chunks...`)
  const chunksResponse = await embeddingProvider.embed(codeChunks)

  console.log(`→ Generating embedding for user question: "${userQuestion}"`)
  const questionResponse = await embeddingProvider.embed([userQuestion])

  console.log(`\n✓ Generated ${chunksResponse.embeddings.length} chunk embeddings`)
  console.log(`✓ Generated 1 question embedding`)
  console.log(
    `✓ Total tokens used: ${(chunksResponse.usage?.totalTokens ?? 0) + (questionResponse.usage?.totalTokens ?? 0)}`
  )

  // Calculate similarity (cosine similarity = 1 - cosine distance)
  const questionEmbed = questionResponse.embeddings[0]!

  console.log('\nSimilarity scores (how relevant each chunk is to the question):')
  codeChunks.forEach((chunk, i) => {
    const chunkEmbed = chunksResponse.embeddings[i]!
    const similarity = cosineSimilarity(questionEmbed, chunkEmbed)
    const percentage = (similarity * 100).toFixed(1)
    const bar = '█'.repeat(Math.floor(similarity * 20))

    console.log(`\n${i + 1}. ${percentage}% similar ${bar}`)
    console.log(`   "${chunk.slice(0, 60)}..."`)
  })

  console.log('\nThe higher the %, the more relevant that code is to the question!')
  console.log('   This is how we find the right code to answer questions.\n')
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!
    normA += a[i]! * a[i]!
    normB += b[i]! * b[i]!
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function main() {
  console.log('Testing Model Provider Abstractions')
  console.log('===================================')

  try {
    await testChatModel()
    await testEmbeddingProvider()
    console.log('✅ All tests completed!')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

main()
