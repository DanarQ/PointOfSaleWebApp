// Creates the single shared Prisma client instance.
// PrismaPg is the connection adapter required for Prisma 5+ with PostgreSQL.
// DATABASE_URL must be set in .env — format: postgresql://user:pass@host:port/dbname
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

export default prisma
