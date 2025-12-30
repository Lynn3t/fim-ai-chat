import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { sanitizeProvider } from '@/lib/api-utils'
import { handleApiError, AppError } from '@/lib/error-handler'

async function getProviderHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params

    // 获取提供商信息
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        models: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!provider) {
      throw AppError.notFound('提供商不存在')
    }

    // 过滤敏感信息
    return NextResponse.json(sanitizeProvider(provider))
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/providers/[id]')
  }
}

export const GET = withAdminAuth(getProviderHandler)

async function updateProviderHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json()
    const { ...updateData } = data
    const { id: providerId } = await params

    // 检查提供商是否存在
    const provider = await prisma.provider.findUnique({
      where: { id: providerId }
    })

    if (!provider) {
      throw AppError.notFound('提供商不存在')
    }

    // 如果更新名称，检查是否与其他提供商冲突
    if (updateData.name && updateData.name !== provider.name) {
      const existingProvider = await prisma.provider.findUnique({
        where: { name: updateData.name }
      })

      if (existingProvider) {
        throw AppError.badRequest('提供商名称已存在')
      }
    }

    // 更新提供商
    const updatedProvider = await prisma.provider.update({
      where: { id: providerId },
      data: updateData,
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

    return NextResponse.json(updatedProvider)
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/providers/[id]')
  }
}

export const PATCH = withAdminAuth(updateProviderHandler)

async function deleteProviderHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params

    // 检查提供商是否存在
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        models: true,
      },
    })

    if (!provider) {
      throw AppError.notFound('提供商不存在')
    }

    // 删除提供商（会级联删除相关模型）
    await prisma.provider.delete({
      where: { id: providerId }
    })

    return NextResponse.json({
      success: true,
      message: `Provider "${provider.displayName}" and ${provider.models.length} models deleted successfully`
    })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/providers/[id]')
  }
}

export const DELETE = withAdminAuth(deleteProviderHandler)
