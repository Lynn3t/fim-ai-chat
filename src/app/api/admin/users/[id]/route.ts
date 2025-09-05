import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api-utils'

// 获取单个用户
async function getUserHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }

  return NextResponse.json(user)
}

export const GET = withAdminAuth(getUserHandler)

// 更新单个用户
async function updateUserHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) {
  const data = await request.json()
  const { isActive, ...updateData } = data
  const { id: targetUserId } = await params

  // 防止管理员禁用自己
  if (userId === targetUserId && isActive === false) {
    return NextResponse.json(
      { error: 'Cannot disable your own account' },
      { status: 400 }
    )
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
}

export const PATCH = withAdminAuth(updateUserHandler)

// 删除单个用户
async function deleteUserHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  const { id: targetUserId } = params

  // 防止管理员删除自己
  if (userId === targetUserId) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    )
  }

  // 检查用户是否存在
  const user = await prisma.user.findUnique({
    where: { id: targetUserId }
  })

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
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
}

export const DELETE = withAdminAuth(deleteUserHandler)
