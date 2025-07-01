import { prisma } from '@/lib/prisma'
import type { TokenUsage } from '@prisma/client'
import { estimateTokens, calculateTokenCost } from '@/lib/token-counter'

export interface CreateTokenUsageData {
  userId: string
  conversationId?: string
  messageId?: string
  providerId: string
  modelId: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  inputText?: string
  outputText?: string
}

export interface TokenUsageStats {
  totalTokens: number
  totalCost: number
  promptTokens: number
  completionTokens: number
  messageCount: number
  conversationCount: number
}

/**
 * 记录token使用量
 */
export async function recordTokenUsage(data: CreateTokenUsageData): Promise<TokenUsage> {
  let { promptTokens, completionTokens, totalTokens } = data
  let isEstimated = false
  let inputChars: number | undefined
  let outputChars: number | undefined

  // 如果没有提供token数据，则进行估算
  if (!promptTokens && !completionTokens && !totalTokens) {
    if (data.inputText) {
      promptTokens = estimateTokens(data.inputText)
      inputChars = data.inputText.length
    }
    if (data.outputText) {
      completionTokens = estimateTokens(data.outputText)
      outputChars = data.outputText.length
    }
    totalTokens = (promptTokens || 0) + (completionTokens || 0)
    isEstimated = true
  }

  // 计算成本
  const cost = calculateTokenCost(
    data.modelId,
    promptTokens || 0,
    completionTokens || 0
  )

  const tokenUsage = await prisma.tokenUsage.create({
    data: {
      userId: data.userId,
      conversationId: data.conversationId,
      messageId: data.messageId,
      providerId: data.providerId,
      modelId: data.modelId,
      promptTokens: promptTokens || 0,
      completionTokens: completionTokens || 0,
      totalTokens: totalTokens || 0,
      isEstimated,
      inputChars,
      outputChars,
      cost,
    },
  })

  // 如果是访客，需要将token使用量计入宿主用户
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { role: true, hostUserId: true },
  })

  if (user?.role === 'GUEST' && user.hostUserId) {
    // 为宿主用户也创建一条记录
    await prisma.tokenUsage.create({
      data: {
        userId: user.hostUserId,
        conversationId: data.conversationId,
        messageId: data.messageId,
        providerId: data.providerId,
        modelId: data.modelId,
        promptTokens: promptTokens || 0,
        completionTokens: completionTokens || 0,
        totalTokens: totalTokens || 0,
        isEstimated,
        inputChars,
        outputChars,
        cost,
      },
    })
  }

  return tokenUsage
}

/**
 * 获取用户的token使用统计
 */
export async function getUserTokenStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TokenUsageStats> {
  const whereClause: any = { userId }
  
  if (startDate || endDate) {
    whereClause.createdAt = {}
    if (startDate) whereClause.createdAt.gte = startDate
    if (endDate) whereClause.createdAt.lte = endDate
  }

  const stats = await prisma.tokenUsage.aggregate({
    where: whereClause,
    _sum: {
      totalTokens: true,
      promptTokens: true,
      completionTokens: true,
      cost: true,
    },
    _count: {
      id: true,
      conversationId: true,
    },
  })

  // 获取唯一对话数量
  const uniqueConversations = await prisma.tokenUsage.findMany({
    where: whereClause,
    select: { conversationId: true },
    distinct: ['conversationId'],
  })

  return {
    totalTokens: stats._sum.totalTokens || 0,
    totalCost: stats._sum.cost || 0,
    promptTokens: stats._sum.promptTokens || 0,
    completionTokens: stats._sum.completionTokens || 0,
    messageCount: stats._count.id || 0,
    conversationCount: uniqueConversations.length,
  }
}

/**
 * 获取用户的详细token使用记录
 */
export async function getUserTokenHistory(
  userId: string,
  options: {
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
  } = {}
): Promise<TokenUsage[]> {
  const { limit = 50, offset = 0, startDate, endDate } = options
  
  const whereClause: any = { userId }
  
  if (startDate || endDate) {
    whereClause.createdAt = {}
    if (startDate) whereClause.createdAt.gte = startDate
    if (endDate) whereClause.createdAt.lte = endDate
  }

  return prisma.tokenUsage.findMany({
    where: whereClause,
    include: {
      provider: true,
      model: true,
      conversation: {
        select: { title: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

/**
 * 获取所有用户的token使用排行榜（管理员功能）
 */
export async function getTokenUsageLeaderboard(
  startDate?: Date,
  endDate?: Date,
  limit: number = 10
): Promise<Array<{
  userId: string
  username: string
  role: string
  totalTokens: number
  totalCost: number
  messageCount: number
}>> {
  const whereClause: any = {}
  
  if (startDate || endDate) {
    whereClause.createdAt = {}
    if (startDate) whereClause.createdAt.gte = startDate
    if (endDate) whereClause.createdAt.lte = endDate
  }

  const stats = await prisma.tokenUsage.groupBy({
    by: ['userId'],
    where: whereClause,
    _sum: {
      totalTokens: true,
      cost: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        totalTokens: 'desc',
      },
    },
    take: limit,
  })

  // 获取用户信息
  const userIds = stats.map(s => s.userId)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, role: true },
  })

  const userMap = new Map(users.map(u => [u.id, u]))

  return stats.map(stat => {
    const user = userMap.get(stat.userId)
    return {
      userId: stat.userId,
      username: user?.username || 'Unknown',
      role: user?.role || 'Unknown',
      totalTokens: stat._sum.totalTokens || 0,
      totalCost: stat._sum.cost || 0,
      messageCount: stat._count.id || 0,
    }
  })
}

/**
 * 获取模型使用统计
 */
export async function getModelUsageStats(
  startDate?: Date,
  endDate?: Date
): Promise<Array<{
  modelId: string
  modelName: string
  providerName: string
  totalTokens: number
  totalCost: number
  messageCount: number
  userCount: number
}>> {
  const whereClause: any = {}
  
  if (startDate || endDate) {
    whereClause.createdAt = {}
    if (startDate) whereClause.createdAt.gte = startDate
    if (endDate) whereClause.createdAt.lte = endDate
  }

  const stats = await prisma.tokenUsage.groupBy({
    by: ['modelId'],
    where: whereClause,
    _sum: {
      totalTokens: true,
      cost: true,
    },
    _count: {
      id: true,
      userId: true,
    },
    orderBy: {
      _sum: {
        totalTokens: 'desc',
      },
    },
  })

  // 获取模型信息
  const modelIds = stats.map(s => s.modelId)
  const models = await prisma.model.findMany({
    where: { id: { in: modelIds } },
    include: { provider: true },
  })

  const modelMap = new Map(models.map(m => [m.id, m]))

  return stats.map(stat => {
    const model = modelMap.get(stat.modelId)
    return {
      modelId: stat.modelId,
      modelName: model?.name || 'Unknown',
      providerName: model?.provider.displayName || 'Unknown',
      totalTokens: stat._sum.totalTokens || 0,
      totalCost: stat._sum.cost || 0,
      messageCount: stat._count.id || 0,
      userCount: stat._count.userId || 0,
    }
  })
}
