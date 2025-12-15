/**
 * CLI tool to run RAG evaluation.
 */

import { prisma } from '@repo-slop/db'
import { TEST_CASES } from './testCases'
import { runEvaluation } from './evaluator'
import { evaluateQuality } from './llmJudge'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

async function main() {
  const args = process.argv.slice(2)
  const runJudge = args.includes('--judge')

  let repoId: string

  const repoArg = args.find((arg) => !arg.startsWith('--'))

  if (!repoArg) {
    const repo = await prisma.repo.findFirst()
    if (!repo) {
      console.error('No repositories found. Please ingest a codebase first.')
      process.exit(1)
    }
    repoId = repo.id
    console.log(`Using repository: ${repo.name}`)
  } else {
    const repo = await prisma.repo.findFirst({
      where: {
        OR: [{ id: repoArg }, { name: repoArg }],
      },
    })

    if (!repo) {
      console.error(`Repository not found: ${repoArg}`)
      process.exit(1)
    }

    repoId = repo.id
    console.log(`Using repository: ${repo.name}`)
  }

  const report = await runEvaluation(TEST_CASES, repoId)

  if (runJudge) {
    const qualityScores = await evaluateQuality(TEST_CASES, report.results)

    const enrichedResults = report.results.map((r) => ({
      ...r,
      qualityScore: qualityScores.get(r.testCaseId),
    }))

    const avgQualityScore =
      Array.from(qualityScores.values()).reduce((sum, s) => sum + s.overallScore, 0) /
      qualityScores.size

    console.log(`\nAverage Quality Score: ${avgQualityScore.toFixed(2)}/5`)

    Object.assign(report, {
      results: enrichedResults,
      avgQualityScore,
    })
  }

  console.log('\nEvaluation Summary')
  console.log('─'.repeat(50))
  console.log(`Total Tests: ${report.totalTests}`)
  console.log(
    `Passed: ${report.passedTests} (${((report.passedTests / report.totalTests) * 100).toFixed(1)}%)`
  )
  console.log(`Failed: ${report.failedTests}`)
  console.log(`\nAverage Source Recall: ${(report.avgSourceRecall * 100).toFixed(1)}%`)
  console.log(`Average Source Precision: ${(report.avgSourcePrecision * 100).toFixed(1)}%`)
  console.log(`Average Concept Coverage: ${(report.avgConceptCoverage * 100).toFixed(1)}%`)
  console.log(`Average Duration: ${report.avgDurationMs.toFixed(0)}ms`)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const reportPath = join(process.cwd(), `evaluation-report-${timestamp}.json`)
  await writeFile(reportPath, JSON.stringify(report, null, 2))
  console.log(`\nReport saved to: ${reportPath}`)

  const failedTests = report.results.filter(
    (r) => r.metrics.sourceRecall < 0.5 || r.metrics.conceptCoverage < 0.6
  )

  if (failedTests.length > 0) {
    console.log(`\nFailed Tests (${failedTests.length}):`)
    console.log('─'.repeat(50))

    for (const test of failedTests) {
      console.log(`\n${test.testCaseId}: ${test.question}`)
      console.log(`  Recall: ${(test.metrics.sourceRecall * 100).toFixed(1)}% (target: >=50%)`)
      console.log(
        `  Concept Coverage: ${(test.metrics.conceptCoverage * 100).toFixed(1)}% (target: >=60%)`
      )
      console.log(
        `  Missing Concepts: ${test.metrics.conceptsCovered.length}/${TEST_CASES.find((tc) => tc.id === test.testCaseId)?.expectedConcepts.length}`
      )
    }
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Evaluation failed:', error)
  process.exit(1)
})
