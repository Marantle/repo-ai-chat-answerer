import { readFile } from 'fs/promises'

interface EvaluationReport {
  results: Array<{
    testCaseId: string
    sources: Array<{
      filePath: string
      similarity: number
      matched?: boolean
    }>
    metrics: {
      conceptCoverage: number
      conceptsCovered: string[]
    }
  }>
}

async function check() {
  const report = JSON.parse(
    await readFile('evaluation-report-2025-12-10T22-56-05-082Z.json', 'utf-8')
  ) as EvaluationReport

  const tc004 = report.results.find((r) => r.testCaseId === 'tc-004')

  if (!tc004) {
    console.log('TC-004 not found in report')
    return
  }

  console.log('TC-004: What database is used and why?')
  console.log('\nExpected files:')
  console.log('  - packages/db/prisma/schema.prisma')
  console.log('  - packages/db/src/index.ts')

  console.log('\nRetrieved sources:')
  tc004.sources.forEach((s) => {
    const matched = s.matched ? '✓' : '✗'
    console.log(`  ${matched} ${s.filePath} (${(s.similarity * 100).toFixed(1)}%)`)
  })

  console.log('\nConcept coverage:', tc004.metrics.conceptCoverage * 100 + '%')
  console.log('Concepts found:', tc004.metrics.conceptsCovered.join(', '))
}

check()
