import { PrismaClient } from '../generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Parse connection string or use default options
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
export const prisma = new PrismaClient({ adapter })

export { PrismaClient } from '../generated/client'
export * from '../generated/client'

// Export TypedSQL queries
export { searchSimilar } from '../generated/sql/searchSimilar'
export { searchInRepo } from '../generated/sql/searchInRepo'
