import { prisma } from '@/lib/prisma'
import type { InviteCode, AccessCode } from '@prisma/client'
import { generateInviteCode, generateAccessCode, isAdminInviteCode } from '@/lib/codes'

export interface CreateInviteCodeData {
  createdBy: string
  expiresAt?: Date
  maxUses?: number
}

export interface CreateAccessCodeData {
  createdBy: string
  allowedModelIds?: string | string[] // 逗号分隔的模型ID列表或数组
  expiresAt?: Date
  maxUses?: number
}

/**
 * 创建邀请码
 */
export async function createInviteCode(data: CreateInviteCodeData): Promise<InviteCode> {
  const code = generateInviteCode()
  
  return prisma.inviteCode.create({
    data: {
      code,
      createdBy: data.createdBy,
      expiresAt: data.expiresAt,
      maxUses: data.maxUses || 1,
    },
  })
}

/**
 * 验证邀请码
 */
export async function validateInviteCode(code: string): Promise<{
  valid: boolean
  inviteCode?: InviteCode
  error?: string
}> {
  // 检查是否为管理员邀请码
  if (isAdminInviteCode(code)) {
    // 检查管理员邀请码是否已被使用
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })
    
    if (adminUser) {
      return { valid: false, error: '管理员邀请码已被使用' }
    }
    
    return { valid: true }
  }

  const inviteCode = await prisma.inviteCode.findUnique({
    where: { code },
  })

  if (!inviteCode) {
    return { valid: false, error: '邀请码不存在' }
  }

  if (inviteCode.isUsed && inviteCode.currentUses >= inviteCode.maxUses) {
    return { valid: false, error: '邀请码已被使用完' }
  }

  if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
    return { valid: false, error: '邀请码已过期' }
  }

  return { valid: true, inviteCode }
}

/**
 * 使用邀请码
 */
export async function useInviteCode(code: string, userId: string): Promise<void> {
  if (isAdminInviteCode(code)) {
    // 管理员邀请码不需要更新数据库记录
    return
  }

  await prisma.inviteCode.update({
    where: { code },
    data: {
      currentUses: { increment: 1 },
      isUsed: true,
      usedBy: userId,
      usedAt: new Date(),
    },
  })
}

/**
 * 创建访问码
 */
export async function createAccessCode(data: CreateAccessCodeData): Promise<AccessCode> {
  const code = generateAccessCode()

  // 处理allowedModelIds：如果是数组，转换为逗号分隔的字符串
  const allowedModelIds = Array.isArray(data.allowedModelIds)
    ? data.allowedModelIds.join(',')
    : data.allowedModelIds

  return prisma.accessCode.create({
    data: {
      code,
      createdBy: data.createdBy,
      allowedModelIds,
      expiresAt: data.expiresAt,
      maxUses: data.maxUses,
    },
  })
}

/**
 * 验证访问码
 */
export async function validateAccessCode(code: string): Promise<{
  valid: boolean
  accessCode?: AccessCode
  error?: string
}> {
  const accessCode = await prisma.accessCode.findUnique({
    where: { code },
    include: {
      creator: true,
    },
  })

  if (!accessCode) {
    return { valid: false, error: '访问码不存在' }
  }

  if (!accessCode.isActive) {
    return { valid: false, error: '访问码已被禁用' }
  }

  if (!accessCode.creator.isActive) {
    return { valid: false, error: '访问码创建者已被封禁' }
  }

  if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
    return { valid: false, error: '访问码已过期' }
  }

  if (accessCode.maxUses && accessCode.currentUses >= accessCode.maxUses) {
    return { valid: false, error: '访问码使用次数已达上限' }
  }

  return { valid: true, accessCode }
}

/**
 * 使用访问码
 */
export async function useAccessCode(code: string): Promise<void> {
  await prisma.accessCode.update({
    where: { code },
    data: {
      currentUses: { increment: 1 },
    },
  })
}

/**
 * 获取用户创建的邀请码列表
 */
export async function getUserInviteCodes(userId: string): Promise<InviteCode[]> {
  return prisma.inviteCode.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * 获取用户创建的访问码列表
 */
export async function getUserAccessCodes(userId: string): Promise<AccessCode[]> {
  return prisma.accessCode.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * 禁用访问码
 */
export async function disableAccessCode(codeId: string, userId: string): Promise<AccessCode> {
  return prisma.accessCode.update({
    where: { 
      id: codeId,
      createdBy: userId, // 确保只能禁用自己创建的访问码
    },
    data: { isActive: false },
  })
}

/**
 * 启用访问码
 */
export async function enableAccessCode(codeId: string, userId: string): Promise<AccessCode> {
  return prisma.accessCode.update({
    where: { 
      id: codeId,
      createdBy: userId, // 确保只能启用自己创建的访问码
    },
    data: { isActive: true },
  })
}

/**
 * 删除邀请码
 */
export async function deleteInviteCode(codeId: string, userId: string): Promise<void> {
  await prisma.inviteCode.delete({
    where: { 
      id: codeId,
      createdBy: userId, // 确保只能删除自己创建的邀请码
    },
  })
}

/**
 * 删除访问码
 */
export async function deleteAccessCode(codeId: string, userId: string): Promise<void> {
  await prisma.accessCode.delete({
    where: { 
      id: codeId,
      createdBy: userId, // 确保只能删除自己创建的访问码
    },
  })
}
