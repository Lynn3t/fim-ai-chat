import { NextRequest, NextResponse } from 'next/server'
import {
  getAllUsers,
  updateUserStatus,
  updateUserAccessCodePermission,
  updateUserPermissions
} from '@/lib/db/admin'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { handleApiError, AppError } from '@/lib/error-handler'
import {
  validatePagination,
  validateSchema,
  createUserSchema,
  updateUserStatusSchema,
  updateAccessCodePermissionSchema,
  updateUserPermissionsSchema,
  deleteUserSchema
} from '@/lib/validation'

async function handleGet(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'
    const role = searchParams.get('role') as 'ADMIN' | 'USER' | 'GUEST' | null
    const isActive = searchParams.get('isActive')

    // 验证分页参数
    const pagination = validatePagination(searchParams)

    const users = await getAllUsers({
      includeStats,
      role: role || undefined,
      isActive: isActive !== null ? isActive === 'true' : undefined,
      ...pagination,
    })

    return NextResponse.json(users)

  } catch (error) {
    return handleApiError(error, 'GET /api/admin/users')
  }
}

// 使用withAdminAuth装饰器包装
export const GET = withAdminAuth(handleGet);

async function handlePost(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()

    // 验证输入数据
    const validatedData = validateSchema(createUserSchema, data)
    const { username, email, password, role } = validatedData

    // 检查用户名是否已存在
    const { prisma } = await import('@/lib/prisma')
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          {
            username: username
          },
          ...(email ? [{ email }] : []),
        ],
      },
    })

    if (existingUser) {
      throw AppError.conflict('用户名或邮箱已存在')
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
    return handleApiError(error, 'POST /api/admin/users')
  }
}

// 使用withAdminAuth装饰器包装
export const POST = withAdminAuth(handlePost);

async function handlePatch(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()

    // 验证输入数据
    let validatedData
    switch (data.action) {
      case 'updateStatus':
        validatedData = validateSchema(updateUserStatusSchema, data)
        break
      case 'updateAccessCodePermission':
        validatedData = validateSchema(updateAccessCodePermissionSchema, data)
        break
      case 'updatePermissions':
        validatedData = validateSchema(updateUserPermissionsSchema, data)
        break
      default:
        throw AppError.badRequest('无效的操作类型')
    }

    const { userId, action, ...updateData } = validatedData

    // 防止管理员封禁自己
    if (action === 'updateStatus' && user.userId === userId && !updateData.isActive) {
      throw AppError.badRequest('不能封禁自己的账户')
    }

    let result
    switch (action) {
      case 'updateStatus':
        result = await updateUserStatus(userId, updateData.isActive)
        break

      case 'updateAccessCodePermission':
        result = await updateUserAccessCodePermission(userId, updateData.canShareAccessCode)
        break

      case 'updatePermissions':
        result = await updateUserPermissions(userId, updateData)
        break
    }

    return NextResponse.json(result)

  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/users')
  }
}

// 使用withAdminAuth装饰器包装
export const PATCH = withAdminAuth(handlePatch);

async function handleDelete(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()

    // 验证输入数据
    const validatedData = validateSchema(deleteUserSchema, data)
    const { userId } = validatedData

    // 防止删除自己
    if (user.userId === userId) {
      throw AppError.badRequest('不能删除自己的账户')
    }

    // 检查要删除的用户是否存在
    const { prisma } = await import('@/lib/prisma')
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!userToDelete) {
      throw AppError.notFound('用户不存在')
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
      message: '用户删除成功'
    })

  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/users')
  }
}

// 使用withAdminAuth装饰器包装
export const DELETE = withAdminAuth(handleDelete);
