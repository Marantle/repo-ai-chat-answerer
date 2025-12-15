/**
 * Evaluation runner for RAG quality assessment.
 */

import { answerQuestion } from '../rag/qa'
import { OpenAIChatModel, OpenAIEmbeddingProvider } from '../providers/openai'
import { retryWithBackoff } from '../utils/retry'
import type { TestCase } from './testCases'

export interface SourceMatch {
  chunkId: string
  filePath: string
  similarity: number
  matched: boolean
}

export interface EvaluationResult {
  testCaseId: string
  question: string
  answer: string
  sources: SourceMatch[]
  metrics: {
    sourceRecall: number // % of expected files found
    sourcePrecision: number // % of retrieved files that were expected
    avgSimilarity: number
    answerLength: number
    conceptsCovered: string[] // Which expected concepts appear in answer
    conceptCoverage: number // % of expected concepts found
  }
  durationMs: number
  timestamp: string
}

export interface EvaluationReport {
  totalTests: number
  passedTests: number
  failedTests: number
  avgSourceRecall: number
  avgSourcePrecision: number
  avgConceptCoverage: number
  avgDurationMs: number
  results: EvaluationResult[]
  timestamp: string
}

function calculateFileMatches(
  retrievedFiles: string[],
  expectedFiles: string[]
): { matchedFiles: string[]; sourceRecall: number; sourcePrecision: number } {
  const expectedFilesSet = new Set(expectedFiles.map((f) => f.toLowerCase()))
  const retrievedFilesSet = new Set(retrievedFiles.map((f) => f.toLowerCase()))

  const matchedFiles = Array.from(retrievedFilesSet).filter((f) =>
    Array.from(expectedFilesSet).some((expected) => f.includes(expected))
  )

  const sourceRecall = expectedFiles.length > 0 ? matchedFiles.length / expectedFiles.length : 1
  const sourcePrecision =
    retrievedFiles.length > 0 ? matchedFiles.length / retrievedFiles.length : 0

  return { matchedFiles, sourceRecall, sourcePrecision }
}

function calculateConceptCoverage(
  answer: string,
  expectedConcepts: string[]
): { conceptsCovered: string[]; conceptCoverage: number } {
  const answerLower = answer.toLowerCase()
  const conceptsCovered = expectedConcepts.filter((concept) =>
    answerLower.includes(concept.toLowerCase())
  )
  const conceptCoverage =
    expectedConcepts.length > 0 ? conceptsCovered.length / expectedConcepts.length : 1

  return { conceptsCovered, conceptCoverage }
}

function mapSourcesToMatches(
  sources: Array<{ chunkId: string; filePath: string; similarity: number }>,
  expectedFiles: string[]
): SourceMatch[] {
  const expectedFilesSet = new Set(expectedFiles.map((f) => f.toLowerCase()))

  return sources.map((s) => ({
    chunkId: s.chunkId,
    filePath: s.filePath,
    similarity: s.similarity,
    matched: Array.from(expectedFilesSet).some((expected) =>
      s.filePath.toLowerCase().includes(expected)
    ),
  }))
}

/**
 * Run a single test case evaluation.
 */
export async function evaluateTestCase(
  testCase: TestCase,
  repoId: string
): Promise<EvaluationResult> {
  const startTime = Date.now()

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not found in environment')

  const chatModel = new OpenAIChatModel({ apiKey })
  const embeddingProvider = new OpenAIEmbeddingProvider({ apiKey })

  const result = await retryWithBackoff(
    () => answerQuestion(testCase.question, chatModel, embeddingProvider, { repoId }),
    { maxRetries: 3, initialDelayMs: 2000 }
  )

  const durationMs = Date.now() - startTime
  const retrievedFiles = result.sources.map((s: { filePath: string }) => s.filePath)
  const { sourceRecall, sourcePrecision } = calculateFileMatches(
    retrievedFiles,
    testCase.expectedFiles
  )
  const { conceptsCovered, conceptCoverage } = calculateConceptCoverage(
    result.answer,
    testCase.expectedConcepts
  )
  const sources = mapSourcesToMatches(result.sources, testCase.expectedFiles)
  const avgSimilarity =
    sources.length > 0 ? sources.reduce((sum, s) => sum + s.similarity, 0) / sources.length : 0

  return {
    testCaseId: testCase.id,
    question: testCase.question,
    answer: result.answer,
    sources,
    metrics: {
      sourceRecall,
      sourcePrecision,
      avgSimilarity,
      answerLength: result.answer.length,
      conceptsCovered,
      conceptCoverage,
    },
    durationMs,
    timestamp: new Date().toISOString(),
  }
}

function calculateAggregateMetrics(results: EvaluationResult[]) {
  const count = results.length
  return {
    avgSourceRecall: results.reduce((sum, r) => sum + r.metrics.sourceRecall, 0) / count,
    avgSourcePrecision: results.reduce((sum, r) => sum + r.metrics.sourcePrecision, 0) / count,
    avgConceptCoverage: results.reduce((sum, r) => sum + r.metrics.conceptCoverage, 0) / count,
    avgDurationMs: results.reduce((sum, r) => sum + r.durationMs, 0) / count,
  }
}

/**
 * Run all test cases and generate a report.
 */
export async function runEvaluation(
  testCases: TestCase[],
  repoId: string
): Promise<EvaluationReport> {
  const results: EvaluationResult[] = []

  console.log(`\n🧪 Running ${testCases.length} test cases...\n`)

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.question}`)
    const result = await evaluateTestCase(testCase, repoId)
    results.push(result)

    console.log(`  ✓ Recall: ${(result.metrics.sourceRecall * 100).toFixed(1)}%`)
    console.log(`  ✓ Precision: ${(result.metrics.sourcePrecision * 100).toFixed(1)}%`)
    console.log(`  ✓ Concept Coverage: ${(result.metrics.conceptCoverage * 100).toFixed(1)}%`)
    console.log(`  ✓ Duration: ${result.durationMs}ms\n`)
  }

  const aggregates = calculateAggregateMetrics(results)
  const passedTests = results.filter(
    (r) => r.metrics.sourceRecall >= 0.5 && r.metrics.conceptCoverage >= 0.6
  ).length

  return {
    totalTests: testCases.length,
    passedTests,
    failedTests: testCases.length - passedTests,
    ...aggregates,
    results,
    timestamp: new Date().toISOString(),
  }
}
