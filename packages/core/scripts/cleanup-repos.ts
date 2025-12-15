import { prisma } from '@repo-slop/db'

const oldRepoIds = [
  'cmj0j9ivw00009gkt3wtrwk1w', // DB Package
  'cmj0j995r0000t0ktmhxs5gsy', // --repo (bad ingestion)
  'cmj0ft8uj0000h0ktry219s9z', // Test Core
]

async function cleanup() {
  console.log('Deleting old repos...')
  const result = await prisma.repo.deleteMany({
    where: {
      id: { in: oldRepoIds },
    },
  })

  console.log(`✓ Deleted ${result.count} repositories`)
  await prisma.$disconnect()
}

cleanup()
