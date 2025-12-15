import { prisma } from '@repo-slop/db'

async function main() {
  const chunks = await prisma.chunk.findMany({
    where: {
      repo: {
        name: 'AI Codebase Copilot Monorepo',
      },
      filePath: {
        contains: 'feedback',
      },
    },
    select: {
      filePath: true,
      startLine: true,
      endLine: true,
    },
  })

  console.log(JSON.stringify(chunks, null, 2))
  process.exit(0)
}

main()
