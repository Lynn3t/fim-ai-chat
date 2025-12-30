import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { handleApiError, AppError } from '@/lib/error-handler'

// 获取单个用户
async function getUserHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        permissions: true,
        settings: true,
        _count: {
          select: {
            conversations: true,
            messages: true,
            tokenUsage: true,
            generatedInvites: true,
            generatedAccessCodes: true,
          },
        },
      },
    })

    if (!user) {
      throw AppError.notFound('用户不存在')
    }

    return NextResponse.json(user)
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/users/[id]')
  }
}

export const GET = withAdminAuth(getUserHandler)

// 更新单个用户
async function updateUserHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json()
    const { isActive, ...updateData } = data
    const { id: targetUserId } = await params

    // 防止管理员禁用自己
    if (user.userId === targetUserId && isActive === false) {
      throw AppError.badRequest('无法禁用自己的账号')
    }

    // 更新用户
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...updateData,
      },
      include: {
        permissions: true,
        settings: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/users/[id]')
  }
}

export const PATCH = withAdminAuth(updateUserHandler)

// 删除单个用户
async function deleteUserHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params

    // 防止管理员删除自己
    if (user.userId === targetUserId) {
      throw AppError.badRequest('无法删除自己的账号')
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!user) {
      throw AppError.notFound('用户不存在')
    }

    // 删除用户（使用事务确保数据一致性）
    await prisma.$transaction(async (tx) => {
      // 删除用户的消息
      await tx.message.deleteMany({
        where: { userId: targetUserId }
      })

      // 删除用户的对话
      await tx.conversation.deleteMany({
        where: { userId: targetUserId }
      })

      // 删除用户的Token使用记录
      await tx.tokenUsage.deleteMany({
        where: { userId: targetUserId }
      })

      // 删除用户的设置
      await tx.userSettings.deleteMany({
        where: { userId: targetUserId }
      })

      // 删除用户的权限
      await tx.userPermission.deleteMany({
        where: { userId: targetUserId }
      })

      // 删除用户创建的邀请码
      await tx.inviteCode.deleteMany({
        where: { createdBy: targetUserId }
      })

      // 删除用户创建的访问码
      await tx.accessCode.deleteMany({
        where: { createdBy: targetUserId }
      })

      // 最后删除用户
      await tx.user.delete({
        where: { id: targetUserId }
      })
    })

    return NextResponse.json({
      success: true,
      message: `User "${user.username}" deleted successfully`
    })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/users/[id]')
  }
}

export const DELETE = withAdminAuth(deleteUserHandler)
