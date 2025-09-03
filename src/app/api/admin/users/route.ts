import { NextRequest, NextResponse } from 'next/server'
import {
  getAllUsers,
  updateUserStatus,
  updateUserAccessCodePermission,
  updateUserPermissions
} from '@/lib/db/admin'
import { checkUserPermission } from '@/lib/auth'
import { withAdminAuth } from '@/lib/api-utils'

async function handleGet(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'
    const role = searchParams.get('role') as 'ADMIN' | 'USER' | 'GUEST' | null
    const isActive = searchParams.get('isActive')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const users = await getAllUsers({
      includeStats,
      role: role || undefined,
      isActive: isActive !== null ? isActive === 'true' : undefined,
      limit,
      offset,
    })

    return NextResponse.json(users)

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// 使用withAdminAuth装饰器包装
export const GET = withAdminAuth(handleGet);

async function handlePost(request: NextRequest, userId: string) {
  try {
    const data = await request.json()
    const { username, email, password, role = 'USER' } = data

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // 检查用户名是否已存在
    const { prisma } = await import('@/lib/prisma')
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          {
            username: {
              equals: username,
              mode: 'insensitive' // 不区分大小写
            }
          },
          ...(email ? [{ email }] : []),
        ],
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '用户名或邮箱已存在' },
        { status: 400 }
      )
    }

    // 哈希密码
    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 12)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role,
        isActive: true,
      },
    })

    // 创建用户设置
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        theme: 'light',
        language: 'zh-CN',
        enableMarkdown: true,
        enableLatex: true,
        enableCodeHighlight: true,
        messagePageSize: 50,
      },
    })

    // 为非管理员用户创建权限配置
    if (role !== 'ADMIN') {
      await prisma.userPermission.create({
        data: {
          userId: user.id,
          tokenLimit: null, // 默认无限制
        },
      })
    }

    return NextResponse.json(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

// 使用withAdminAuth装饰器包装
export const POST = withAdminAuth(handlePost);

async function handlePatch(request: NextRequest, adminUserId: string) {
  try {
    const data = await request.json()
    const { userId, action, ...updateData } = data

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId and action are required' },
        { status: 400 }
      )
    }

    let result
    switch (action) {
      case 'updateStatus':
        // 防止管理员封禁自己
        if (adminUserId === userId && !updateData.isActive) {
          return NextResponse.json(
            { error: 'Cannot ban your own account' },
            { status: 400 }
          )
        }
        result = await updateUserStatus(userId, updateData.isActive)
        break
      
      case 'updateAccessCodePermission':
        result = await updateUserAccessCodePermission(userId, updateData.canShareAccessCode)
        break
      
      case 'updatePermissions':
        result = await updateUserPermissions(userId, updateData)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// 使用withAdminAuth装饰器包装
export const PATCH = withAdminAuth(handlePatch);

async function handleDelete(request: NextRequest, adminUserId: string) {
  try {
    const data = await request.json()
    const { userId } = data

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // 防止删除自己
    if (adminUserId === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // 检查要删除的用户是否存在
    const { prisma } = await import('@/lib/prisma')
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 删除用户（硬删除，包括相关数据）
    await prisma.$transaction(async (tx) => {
      // 删除用户的聊天记录
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

      // 删除用户的权限
      await tx.userPermission.deleteMany({
        where: { userId }
      })

      // 删除用户生成的邀请码
      await tx.inviteCode.deleteMany({
        where: { createdBy: userId }
      })

      // 删除用户生成的访问码
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
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

// 使用withAdminAuth装饰器包装
export const DELETE = withAdminAuth(handleDelete);
