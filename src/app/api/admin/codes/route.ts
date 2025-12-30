import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInviteCode } from '@/lib/codes'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { handleApiError, AppError } from '@/lib/error-handler'

async function handleGet(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'invite' // 'invite' or 'access'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (type === 'invite') {
      // 获取邀请码列表
      const inviteCodes = await prisma.inviteCode.findMany({
        include: {
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      return NextResponse.json(inviteCodes)
    } else if (type === 'access') {
      // 获取访问码列表
      const accessCodes = await prisma.accessCode.findMany({
        include: {
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      return NextResponse.json(accessCodes)
    } else {
      throw AppError.badRequest('无效的类型参数')
    }

  } catch (error) {
    return handleApiError(error, 'GET /api/admin/codes')
  }
}

async function handlePost(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()
    const { type, role, maxUses, expiresAt } = data

    if (!type) {
      throw AppError.badRequest('缺少 type 参数')
    }

    if (type === 'invite') {
      // 创建邀请码
      const code = generateInviteCode()

      const inviteCode = await prisma.inviteCode.create({
        data: {
          code,
          maxUses: maxUses || 1,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdBy: user.userId,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      })

      return NextResponse.json(inviteCode)
    } else if (type === 'access') {
      // 创建访问码
      const code = generateInviteCode() // 可以复用同样的生成逻辑

      const accessCode = await prisma.accessCode.create({
        data: {
          code,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdBy: user.userId,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      })

      return NextResponse.json(accessCode)
    } else {
      throw AppError.badRequest('无效的类型参数')
    }

  } catch (error) {
    return handleApiError(error, 'POST /api/admin/codes')
  }
}

async function handleDelete(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()
    const { codeId, type } = data

    if (!codeId || !type) {
      throw AppError.badRequest('缺少 codeId 或 type 参数')
    }

    if (type === 'invite') {
      // 删除邀请码
      await prisma.inviteCode.delete({
        where: { id: codeId },
      })
    } else if (type === 'access') {
      // 删除访问码
      await prisma.accessCode.delete({
        where: { id: codeId },
      })
    } else {
      throw AppError.badRequest('无效的类型参数')
    }

    return NextResponse.json({
      success: true,
      message: 'Code deleted successfully'
    })

  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/codes')
  }
}

async function handlePatch(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()
    const { codeId, type, action, ...updateData } = data

    if (!codeId || !type || !action) {
      throw AppError.badRequest('缺少 codeId, type 或 action 参数')
    }

    let result
    if (type === 'invite') {
      if (action === 'toggle') {
        // 切换邀请码状态
        const inviteCode = await prisma.inviteCode.findUnique({
          where: { id: codeId }
        })

        if (!inviteCode) {
          throw AppError.notFound('邀请码不存在')
        }

        result = await prisma.inviteCode.update({
          where: { id: codeId },
          data: { isUsed: !inviteCode.isUsed },
        })
      } else {
        throw AppError.badRequest('无效的操作类型')
      }
    } else if (type === 'access') {
      if (action === 'toggle') {
        // 切换访问码状态
        const accessCode = await prisma.accessCode.findUnique({
          where: { id: codeId }
        })

        if (!accessCode) {
          throw AppError.notFound('访问码不存在')
        }

        result = await prisma.accessCode.update({
          where: { id: codeId },
          data: { isActive: !accessCode.isActive },
        })
      } else {
        throw AppError.badRequest('无效的操作类型')
      }
    } else {
      throw AppError.badRequest('无效的类型参数')
    }

    return NextResponse.json(result)

  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/codes')
  }
}

export const GET = withAdminAuth(handleGet)
export const POST = withAdminAuth(handlePost)
export const DELETE = withAdminAuth(handleDelete)
export const PATCH = withAdminAuth(handlePatch)
