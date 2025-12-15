/**
 * Batch ingestion CLI: Ingests all direct subdirectories of a parent directory.
 * Each subdirectory is treated as a separate repository with its directory name as the repo name.
 */

import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import { prisma } from '@repo-slop/db'
import { runIngestion } from './cli'

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: pnpm ingest:batch <parent-directory>')
    console.log('\nExample:')
    console.log('  pnpm ingest:batch /path/to/repos')
    console.log('\nThis will ingest each subdirectory as a separate repository.')
    process.exit(1)
  }

  const parentDir = args[0]!

  try {
    const entries = readdirSync(parentDir)
    const subdirs = entries.filter((entry) => {
      if (entry.startsWith('.')) return false
      if (entry === 'node_modules') return false
      
      const fullPath = join(parentDir, entry)
      try {
        const stat = statSync(fullPath)
        return stat.isDirectory()
      } catch {
        return false
      }
    })

    if (subdirs.length === 0) {
      console.log(`No subdirectories found in: ${parentDir}`)
      process.exit(0)
    }

    console.log(`Found ${subdirs.length} subdirectories to ingest:\n`)
    subdirs.forEach((dir, i) => console.log(`  ${i + 1}. ${dir}`))
    console.log('')

    let successCount = 0
    let failCount = 0

    for (const [index, subdir] of subdirs.entries()) {
      const repoPath = join(parentDir, subdir)
      const repoName = subdir

      console.log(`\n${'='.repeat(80)}`)
      console.log(`Ingesting ${index + 1}/${subdirs.length}: ${repoName}`)
      console.log(`Path: ${repoPath}`)
      console.log('='.repeat(80))

      try {
        await runIngestion({ repoPath, repoName })
        successCount++
        console.log(`✓ Successfully ingested ${repoName}`)
      } catch (error) {
        failCount++
        console.error(`✗ Failed to ingest ${repoName}:`, error)
        console.log('Continuing with next repository...\n')
      }
    }

    console.log(`\n${'='.repeat(80)}`)
    console.log('Batch ingestion complete!')
    console.log(`Total repositories: ${subdirs.length}`)
    console.log(`Successful: ${successCount}`)
    console.log(`Failed: ${failCount}`)
    console.log('='.repeat(80))
  } catch (error) {
    console.error('Batch ingestion failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
