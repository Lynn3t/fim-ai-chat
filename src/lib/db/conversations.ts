import { prisma } from '@/lib/prisma'
import type { Conversation, Message } from '@prisma/client'

export interface CreateConversationData {
  userId: string
  providerId: string
  modelId: string
  title: string
}

export interface UpdateConversationData {
  title?: string
  isArchived?: boolean
  isPinned?: boolean
}

export interface CreateMessageData {
  conversationId: string
  userId: string
  providerId: string
  modelId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  rawContent?: string
  finishReason?: string
  tokenUsage?: any
}

export interface UpdateMessageData {
  content?: string
  rawContent?: string
  isEdited?: boolean
  isDeleted?: boolean
}

/**
 * 创建对话
 */
export async function createConversation(data: CreateConversationData): Promise<Conversation> {
  // 检查用户是否为访客，访客的对话不存储到数据库
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { role: true },
  })

  if (user?.role === 'GUEST') {
    // 访客的对话不存储到数据库，返回一个临时对话对象
    throw new Error('Guest conversations should not be stored in database')
  }

  return prisma.conversation.create({
    data,
    include: {
      user: true,
      provider: true,
      model: true,
    },
  })
}

/**
 * 获取用户的对话列表
 */
export async function getUserConversations(
  userId: string,
  options: {
    includeArchived?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<Conversation[]> {
  const { includeArchived = false, limit = 50, offset = 0 } = options

  return prisma.conversation.findMany({
    where: {
      userId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    include: {
      provider: true,
      model: true,
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          role: true,
          createdAt: true,
        },
      },
      _count: {
        select: { messages: true },
      },
    },
    orderBy: [
      { isPinned: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: limit,
    skip: offset,
  })
}

/**
 * 根据 ID 获取对话
 */
export async function getConversationById(id: string): Promise<Conversation | null> {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      user: true,
      provider: true,
      model: true,
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        include: {
          user: true,
          provider: true,
          model: true,
        },
      },
    },
  })
}

/**
 * 更新对话
 */
export async function updateConversation(
  id: string,
  data: UpdateConversationData
): Promise<Conversation> {
  return prisma.conversation.update({
    where: { id },
    data,
  })
}

/**
 * 删除对话
 */
export async function deleteConversation(id: string): Promise<Conversation> {
  return prisma.conversation.delete({
    where: { id },
  })
}

/**
 * 创建消息
 */
export async function createMessage(data: CreateMessageData): Promise<Message> {
  // 检查用户是否为访客，访客的消息不存储到数据库
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { role: true },
  })

  if (user?.role === 'GUEST') {
    // 访客的消息不存储到数据库，返回一个临时消息对象
    throw new Error('Guest messages should not be stored in database')
  }

  const message = await prisma.message.create({
    data,
    include: {
      user: true,
      provider: true,
      model: true,
    },
  })

  // 更新对话的 updatedAt 时间
  await prisma.conversation.update({
    where: { id: data.conversationId },
    data: { updatedAt: new Date() },
  })

  return message
}

/**
 * 获取对话的消息列表
 */
export async function getConversationMessages(
  conversationId: string,
  options: {
    limit?: number
    offset?: number
    includeDeleted?: boolean
  } = {}
): Promise<Message[]> {
  const { limit = 50, offset = 0, includeDeleted = false } = options

  return prisma.message.findMany({
    where: {
      conversationId,
      ...(includeDeleted ? {} : { isDeleted: false }),
    },
    include: {
      user: true,
      provider: true,
      model: true,
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    skip: offset,
  })
}

/**
 * 根据 ID 获取消息
 */
export async function getMessageById(id: string): Promise<Message | null> {
  return prisma.message.findUnique({
    where: { id },
    include: {
      user: true,
      provider: true,
      model: true,
      conversation: true,
    },
  })
}

/**
 * 更新消息
 */
export async function updateMessage(id: string, data: UpdateMessageData): Promise<Message> {
  return prisma.message.update({
    where: { id },
    data,
  })
}

/**
 * 软删除消息
 */
export async function deleteMessage(id: string): Promise<Message> {
  return prisma.message.update({
    where: { id },
    data: { isDeleted: true },
  })
}

/**
 * 搜索对话
 */
export async function searchConversations(
  userId: string,
  query: string,
  limit = 20
): Promise<Conversation[]> {
  return prisma.conversation.findMany({
    where: {
      userId,
      isArchived: false,
      OR: [
        { title: { contains: query } },
        {
          messages: {
            some: {
              content: { contains: query },
              isDeleted: false,
            },
          },
        },
      ],
    },
    include: {
      provider: true,
      model: true,
      _count: {
        select: { messages: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })
}
