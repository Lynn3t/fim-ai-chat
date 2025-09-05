import { PrismaClient } from '@prisma/client'
import { validateEnvironmentVariables } from '@/lib/auth'

// 在应用启动时验证关键环境变量
validateEnvironmentVariables()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
