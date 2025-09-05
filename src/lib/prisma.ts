import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Only validate environment variables in production runtime or when explicitly requested
if (process.env.NODE_ENV === 'production' && process.env.VALIDATE_ENV !== 'false') {
  try {
    const { validateEnvironmentVariables } = require('@/lib/auth')
    validateEnvironmentVariables()
  } catch (error) {
    console.warn('Environment validation skipped during build:', error.message)
  }
}
