import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { handleApiError, AppError } from '@/lib/error-handler'

async function handleGet(request: NextRequest, user: AuthUser) {
  try {
    // 获取所有模型，包括定价信息
    const models = await prisma.model.findMany({
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        pricing: true, // 包含模型定价信息
      },
      orderBy: [
        { provider: { name: 'asc' } },
        { order: 'asc' },
        { name: 'asc' },
      ],
    })

    // 为没有定价信息的模型提供默认值
    const modelsWithDefaultPricing = models.map(model => {
      if (!model.pricing) {
        return {
          ...model,
          pricing: {
            id: null,
            modelId: model.id,
            pricingType: 'token',
            inputPrice: 2.0, // $2.00 / 1M 令牌
            cachedInputPrice: 2.0,
            outputPrice: 8.0, // $8.00 / 1M 令牌
            usagePrice: null,
            createdAt: null,
            updatedAt: null,
          }
        };
      }
      return model;
    });

    return NextResponse.json(modelsWithDefaultPricing)

  } catch (error) {
    return handleApiError(error, 'GET /api/admin/models')
  }
}

async function handlePatch(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()
    const { modelId, isEnabled, ...updateData } = data

    if (!modelId) {
      throw AppError.badRequest('缺少 modelId 参数')
    }

    // 检查模型是否存在
    const model = await prisma.model.findUnique({
      where: { id: modelId }
    })

    if (!model) {
      throw AppError.notFound('模型不存在')
    }

    // 更新模型
    const updatedModel = await prisma.model.update({
      where: { id: modelId },
      data: {
        isEnabled: isEnabled !== undefined ? isEnabled : model.isEnabled,
        ...updateData,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    })

    return NextResponse.json(updatedModel)

  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/models')
  }
}

async function handlePost(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()
    const { providerId, modelId, name, description, group, ...modelData } = data

    if (!providerId || !modelId || !name) {
      throw AppError.badRequest('缺少 providerId, modelId 或 name 参数')
    }

    // 检查提供商是否存在
    const provider = await prisma.provider.findUnique({
      where: { id: providerId }
    })

    if (!provider) {
      throw AppError.notFound('提供商不存在')
    }

    // 检查模型ID是否已存在
    const existingModel = await prisma.model.findFirst({
      where: {
        providerId,
        modelId,
      }
    })

    if (existingModel) {
      throw AppError.badRequest('该提供商下已存在相同 ID 的模型')
    }

    // 获取当前提供商下最大的 order 值
    const maxOrderModel = await prisma.model.findFirst({
      where: { providerId },
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    const nextOrder = (maxOrderModel?.order || 0) + 1

    // 创建新模型
    const newModel = await prisma.model.create({
      data: {
        providerId,
        modelId,
        name,
        description,
        group,
        isEnabled: true,
        order: nextOrder,
        ...modelData,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    })

    return NextResponse.json(newModel, { status: 201 })

  } catch (error) {
    return handleApiError(error, 'POST /api/admin/models')
  }
}

async function handlePut(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()
    const { models } = data

    if (!Array.isArray(models)) {
      throw AppError.badRequest('缺少 models 数组')
    }

    // 使用事务批量更新模型排序，避免并发冲突
    await prisma.$transaction(
      models.map((model: { id: string; order: number }) =>
        prisma.model.update({
          where: { id: model.id },
          data: { order: model.order },
        })
      )
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/models')
  }
}

async function handleDelete(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()
    const { modelId } = data

    if (!modelId) {
      throw AppError.badRequest('缺少 modelId 参数')
    }

    // 检查模型是否存在
    const model = await prisma.model.findUnique({
      where: { id: modelId }
    })

    if (!model) {
      throw AppError.notFound('模型不存在')
    }

    // 检查是否有相关的对话或消息
    const conversationCount = await prisma.conversation.count({
      where: { modelId }
    })

    const messageCount = await prisma.message.count({
      where: { modelId }
    })

    if (conversationCount > 0 || messageCount > 0) {
      throw AppError.badRequest('无法删除有关联对话或消息的模型')
    }

    // 删除模型
    await prisma.model.delete({
      where: { id: modelId }
    })

    return NextResponse.json({
      success: true,
      message: 'Model deleted successfully'
    })

  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/models')
  }
}

export const GET = withAdminAuth(handleGet)
export const PATCH = withAdminAuth(handlePatch)
export const POST = withAdminAuth(handlePost)
export const PUT = withAdminAuth(handlePut)
export const DELETE = withAdminAuth(handleDelete)
