import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { sanitizeProviders, sanitizeProvider } from '@/lib/api-utils'
import { handleApiError, AppError } from '@/lib/error-handler'

async function handleGet(request: NextRequest, user: AuthUser) {
  try {
    // 获取所有提供商
    const providers = await prisma.provider.findMany({
      include: {
        models: {
          select: {
            id: true,
            modelId: true,
            name: true,
            isEnabled: true,
            group: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(sanitizeProviders(providers))

  } catch (error) {
    return handleApiError(error, 'GET /api/admin/providers')
  }
}

async function handlePost(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()
    const { name, displayName, baseUrl, apiKey, icon, description } = data

    if (!name || !displayName) {
      throw AppError.badRequest('缺少 name 或 displayName 参数')
    }

    // 检查提供商名称是否已存在
    const existingProvider = await prisma.provider.findUnique({
      where: { name }
    })

    if (existingProvider) {
      throw AppError.badRequest('提供商名称已存在')
    }

    // 获取当前最大排序值
    const maxOrderProvider = await prisma.provider.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    // 创建新提供商
    const newProvider = await prisma.provider.create({
      data: {
        name,
        displayName,
        baseUrl,
        apiKey,
        icon,
        description,
        isEnabled: true,
        order: (maxOrderProvider?.order || 0) + 1,
      },
      include: {
        models: {
          select: {
            id: true,
            modelId: true,
            name: true,
            isEnabled: true,
            group: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(sanitizeProvider(newProvider), { status: 201 })

  } catch (error) {
    return handleApiError(error, 'POST /api/admin/providers')
  }
}

async function handlePut(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()
    const { providers } = data

    if (!Array.isArray(providers)) {
      throw AppError.badRequest('缺少 providers 数组')
    }

    // 批量更新提供商排序
    const updatePromises = providers.map((provider: { id: string; order: number }) => {
      return prisma.provider.update({
        where: { id: provider.id },
        data: { order: provider.order },
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true })

  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/providers')
  }
}

export const GET = withAdminAuth(handleGet)
export const POST = withAdminAuth(handlePost)
export const PUT = withAdminAuth(handlePut)
