import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkUserPermission } from '@/lib/auth'

// 获取单个用户
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// 更新单个用户
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json()
    const { adminUserId, isActive, ...updateData } = data
    const { id: userId } = await params

    if (!adminUserId) {
      return NextResponse.json(
        { error: 'adminUserId is required' },
        { status: 400 }
      )
    }

    // 检查管理员权限
    const hasPermission = await checkUserPermission(adminUserId, 'admin_panel')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // 防止管理员禁用自己
    if (adminUserId === userId && isActive === false) {
      return NextResponse.json(
        { error: 'Cannot disable your own account' },
        { status: 400 }
      )
    }

    // 更新用户
    const updatedUser = await prisma.user.update({
      where: { id: userId },
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
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// 删除单个用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const adminUserId = searchParams.get('adminUserId')
    const { id: userId } = await params

    if (!adminUserId) {
      return NextResponse.json(
        { error: 'adminUserId is required' },
        { status: 400 }
      )
    }

    // 检查管理员权限
    const hasPermission = await checkUserPermission(adminUserId, 'admin_panel')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // 防止管理员删除自己
    if (adminUserId === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
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
        where: { userId }
      })

      // 删除用户的对话
      await tx.conversation.deleteMany({
        where: { userId }
      })

      // 删除用户的Token使用记录
      await tx.tokenUsage.deleteMany({
        where: { userId }
      })

      // 删除用户的设置
      await tx.userSettings.deleteMany({
        where: { userId }
      })

      // 删除用户的权限
      await tx.userPermission.deleteMany({
        where: { userId }
      })

      // 删除用户创建的邀请码
      await tx.inviteCode.deleteMany({
        where: { createdBy: userId }
      })

      // 删除用户创建的访问码
      await tx.accessCode.deleteMany({
        where: { createdBy: userId }
      })

      // 最后删除用户
      await tx.user.delete({
        where: { id: userId }
      })
    })

    return NextResponse.json({ 
      success: true, 
      message: `User "${user.username}" deleted successfully` 
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
