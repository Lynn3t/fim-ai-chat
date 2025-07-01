import { prisma } from '@/lib/prisma'
import type { User, UserSettings } from '@prisma/client'

export interface CreateUserData {
  email?: string
  username?: string
  avatar?: string
}

export interface UpdateUserData {
  email?: string
  username?: string
  avatar?: string
}

export interface CreateUserSettingsData {
  defaultModelId?: string
  theme?: string
  language?: string
  enableMarkdown?: boolean
  enableLatex?: boolean
  enableCodeHighlight?: boolean
  messagePageSize?: number
}

/**
 * 创建用户
 */
export async function createUser(data: CreateUserData): Promise<User> {
  return prisma.user.create({
    data,
  })
}

/**
 * 根据 ID 获取用户
 */
export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
    include: {
      settings: true,
    },
  })
}

/**
 * 根据邮箱获取用户
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
    include: {
      settings: true,
    },
  })
}

/**
 * 根据用户名获取用户
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { username },
    include: {
      settings: true,
    },
  })
}

/**
 * 更新用户信息
 */
export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  return prisma.user.update({
    where: { id },
    data,
  })
}

/**
 * 删除用户
 */
export async function deleteUser(id: string): Promise<User> {
  return prisma.user.delete({
    where: { id },
  })
}

/**
 * 创建或更新用户设置
 */
export async function upsertUserSettings(
  userId: string,
  data: CreateUserSettingsData
): Promise<UserSettings> {
  return prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  })
}

/**
 * 获取用户设置
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  return prisma.userSettings.findUnique({
    where: { userId },
  })
}
