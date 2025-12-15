/**
 * LLM-as-judge for answer quality evaluation.
 */

import { OpenAIChatModel } from '../providers/openai'
import type { EvaluationResult } from './evaluator'
import type { TestCase } from './testCases'

export interface QualityScore {
  relevance: number // 1-5: How relevant is the answer to the question?
  accuracy: number // 1-5: Is the answer technically accurate?
  completeness: number // 1-5: Does it cover all important aspects?
  clarity: number // 1-5: Is the answer clear and well-structured?
  hallucination: number // 1-5: Any made-up information? (1=lots, 5=none)
  overallScore: number // Average of all scores
  reasoning: string
}

const JUDGE_PROMPT = `You are an expert code reviewer evaluating RAG system responses.

Question: {QUESTION}

Expected concepts that should be covered: {CONCEPTS}

Answer to evaluate:
{ANSWER}

Retrieved source files:
{SOURCES}

Rate the answer on these criteria (1-5 scale):
1. Relevance: Does it answer the question?
2. Accuracy: Is the information technically correct?
3. Completeness: Are all important aspects covered?
4. Clarity: Is it well-structured and easy to understand?
5. Hallucination: Is there any made-up information? (1=lots of hallucination, 5=no hallucination)

Respond in JSON format:
{
  "relevance": 1-5,
  "accuracy": 1-5,
  "completeness": 1-5,
  "clarity": 1-5,
  "hallucination": 1-5,
  "reasoning": "Brief explanation of your scores"
}`

/**
 * Use GPT-4 to judge answer quality.
 */
export async function judgeAnswerQuality(
  testCase: TestCase,
  result: EvaluationResult
): Promise<QualityScore> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found')
  }

  const judge = new OpenAIChatModel({ apiKey }, 'gpt-4o-mini')

  const sourcesText = result.sources
    .map((s) => `- ${s.filePath} (${(s.similarity * 100).toFixed(1)}% similar)`)
    .join('\n')

  const prompt = JUDGE_PROMPT.replace('{QUESTION}', testCase.question)
    .replace('{CONCEPTS}', testCase.expectedConcepts.join(', '))
    .replace('{ANSWER}', result.answer)
    .replace('{SOURCES}', sourcesText)

  const response = await judge.complete([
    {
      role: 'system',
      content: 'You are an expert evaluator. Always respond with valid JSON only.',
    },
    { role: 'user', content: prompt },
  ])

  const jsonMatch = response.content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse judge response as JSON')
  }

  const scores = JSON.parse(jsonMatch[0]) as Omit<QualityScore, 'overallScore'>

  const overallScore =
    (scores.relevance +
      scores.accuracy +
      scores.completeness +
      scores.clarity +
      scores.hallucination) /
    5

  return {
    ...scores,
    overallScore,
  }
}

/**
 * Run quality evaluation on all results.
 */
export async function evaluateQuality(
  testCases: TestCase[],
  results: EvaluationResult[]
): Promise<Map<string, QualityScore>> {
  const scores = new Map<string, QualityScore>()

  console.log('\nRunning LLM-as-judge quality evaluation...\n')

  for (const result of results) {
    const testCase = testCases.find((tc) => tc.id === result.testCaseId)
    if (!testCase) continue

    console.log(`Judging: ${testCase.question}`)
    const score = await judgeAnswerQuality(testCase, result)
    scores.set(result.testCaseId, score)

    console.log(`  Overall: ${score.overallScore.toFixed(1)}/5`)
    console.log(`  Relevance: ${score.relevance}/5`)
    console.log(`  Accuracy: ${score.accuracy}/5`)
    console.log(`  Hallucination: ${score.hallucination}/5\n`)
  }

  return scores
}
