import { prisma } from '../src/index'

async function main(): Promise<void> {
  console.log('Testing database connection...')

  // Test connection
  await prisma.$connect()
  console.log('✓ Connected to database')

  // Create a test repo
  const repo = await prisma.repo.create({
    data: {
      name: 'test-repo',
      rootPath: '/test/path',
    },
  })
  console.log('✓ Created test repo:', repo.id)

  // Verify pgvector is working
  await prisma.$executeRaw`SELECT vector('[1,2,3]')::vector(3) as test_vector`
  console.log('✓ pgvector extension is working')

  // Cleanup
  await prisma.repo.delete({ where: { id: repo.id } })
  console.log('✓ Cleaned up test data')

  console.log('\nAll tests passed!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
