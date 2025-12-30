import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'

interface BatchModelData {
  modelId: string
  name: string
  description?: string
  group?: string
  isEnabled?: boolean
}

interface BatchCreateRequest {
  providerId: string
  models: BatchModelData[]
}

async function handlePost(request: NextRequest, user: AuthUser) {
  try {
    const data: BatchCreateRequest = await request.json()
    const { providerId, models } = data

    if (!providerId || !Array.isArray(models) || models.length === 0) {
      return NextResponse.json(
        { error: 'providerId and models array are required' },
        { status: 400 }
      )
    }

    // 检查提供商是否存在
    const provider = await prisma.provider.findUnique({
      where: { id: providerId }
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    // 获取当前提供商下最大的 order 值
    const maxOrderModel = await prisma.model.findFirst({
      where: { providerId },
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    // 使用事务进行批量操作以提高性能
    const result = await prisma.$transaction(async (tx) => {
      let nextOrder = (maxOrderModel?.order || 0) + 1
      const results = []
      const errors = []

      // 首先批量检查已存在的模型
      const existingModels = await tx.model.findMany({
        where: {
          providerId,
          modelId: { in: models.map(m => m.modelId) }
        },
        select: { modelId: true }
      })

      const existingModelIds = new Set(existingModels.map(m => m.modelId))

      // 过滤出需要创建的模型
      const modelsToCreate = []

      for (const modelData of models) {
        const { modelId, name, description, group, isEnabled = true } = modelData

        if (!modelId || !name) {
          errors.push({ modelId, error: 'modelId and name are required' })
          continue
        }

        if (existingModelIds.has(modelId)) {
          errors.push({ modelId, error: 'Model with this ID already exists for this provider' })
          continue
        }

        modelsToCreate.push({
          providerId,
          modelId,
          name,
          description,
          group,
          isEnabled,
          order: nextOrder++,
        })
      }

      // 批量创建模型
      if (modelsToCreate.length > 0) {
        // 使用 createMany 进行批量插入
        await tx.model.createMany({
          data: modelsToCreate,
        })

        // 然后查询刚创建的模型
        const createdModels = await tx.model.findMany({
          where: {
            providerId,
            modelId: { in: modelsToCreate.map(m => m.modelId) }
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
        results.push(...createdModels)
      }

      return { results, errors }
    })

    const { results, errors } = result
    const successCount = results.length
    const failCount = errors.length

    return NextResponse.json({
      success: true,
      successCount,
      failCount,
      totalCount: models.length,
      models: results,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 })

  } catch (error) {
    console.error('Error in batch model creation:', error)
    return NextResponse.json(
      { error: 'Failed to create models in batch' },
      { status: 500 }
    )
  }
}

export const POST = withAdminAuth(handlePost)
