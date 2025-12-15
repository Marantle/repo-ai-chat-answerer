/**
 * Test cases for RAG evaluation.
 */

export interface TestCase {
  id: string
  question: string
  expectedFiles: string[] // Files that should appear in sources
  expectedConcepts: string[] // Key concepts that should be in answer
  category: 'architecture' | 'implementation' | 'api' | 'data-flow'
}

export const TEST_CASES: TestCase[] = [
  {
    id: 'tc-001',
    question: 'How does the embedding generation work?',
    expectedFiles: ['packages/core/src/providers/openai.ts', 'packages/core/src/ingest/ingest.ts'],
    expectedConcepts: ['OpenAI', 'text-embedding-3-small', 'batch', 'vector'],
    category: 'implementation',
  },
  {
    id: 'tc-002',
    question: 'What is the chunking algorithm?',
    expectedFiles: ['packages/core/src/ingest/chunking.ts'],
    expectedConcepts: ['lines', 'overlap', 'maxChunkSize', 'minChunkSize'],
    category: 'implementation',
  },
  {
    id: 'tc-003',
    question: 'How does vector search work?',
    expectedFiles: [
      'packages/core/src/search/vectorSearch.ts',
      'packages/db/sql/searchSimilar.sql',
    ],
    expectedConcepts: ['cosine similarity', 'embedding', 'pgvector', 'ORDER BY'],
    category: 'implementation',
  },
  {
    id: 'tc-004',
    question: 'What database is used and why?',
    expectedFiles: ['packages/db/prisma/schema.prisma', 'packages/db/src/index.ts'],
    expectedConcepts: ['PostgreSQL', 'pgvector', 'Prisma', 'vector(1536)'],
    category: 'architecture',
  },
  {
    id: 'tc-005',
    question: 'How does the chat API handle streaming?',
    expectedFiles: ['apps/web/app/api/ask/route.ts', 'packages/core/src/rag/qa.ts'],
    expectedConcepts: ['SSE', 'Server-Sent Events', 'ReadableStream', 'TextEncoder'],
    category: 'api',
  },
  {
    id: 'tc-006',
    question: 'What model providers are supported?',
    expectedFiles: ['packages/core/src/providers/openai.ts', 'packages/core/src/modelProvider.ts'],
    expectedConcepts: ['OpenAI', 'ChatModel', 'EmbeddingModel', 'interface'],
    category: 'architecture',
  },
  {
    id: 'tc-007',
    question: 'How is the codebase ingested?',
    expectedFiles: [
      'packages/core/src/ingest/cli.ts',
      'packages/core/src/ingest/ingest.ts',
      'packages/core/src/ingest/walker.ts',
    ],
    expectedConcepts: ['walkDirectory', 'chunk', 'embed', 'upsert'],
    category: 'data-flow',
  },
  {
    id: 'tc-008',
    question: 'What files are ignored during ingestion?',
    expectedFiles: ['packages/core/src/ingest/walker.ts'],
    expectedConcepts: ['node_modules', '.git', 'gitignore', 'DEFAULT_IGNORE_DIRS'],
    category: 'implementation',
  },
  {
    id: 'tc-009',
    question: 'How does feedback work?',
    expectedFiles: ['apps/web/app/api/feedback/route.ts', 'packages/db/prisma/schema.prisma'],
    expectedConcepts: ['UP', 'DOWN', 'Feedback', 'interaction.update'],
    category: 'api',
  },
  {
    id: 'tc-010',
    question: 'What programming languages are supported?',
    expectedFiles: ['packages/core/src/ingest/language.ts'],
    expectedConcepts: ['TypeScript', 'JavaScript', 'Python', 'extension'],
    category: 'implementation',
  },
]
