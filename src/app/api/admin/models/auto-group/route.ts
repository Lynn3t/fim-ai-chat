import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api-utils'
import { getAIModelCategoryName } from '@/utils/aiModelUtils'

// 自动分组接口
async function autoGroupHandler(
  request: NextRequest,
  userId: string
) {
  const data = await request.json()
  const { providerId, modelIds } = data

  let modelsToUpdate: any[] = []

  if (providerId) {
    // 为指定提供商的所有模型自动分组
    modelsToUpdate = await prisma.model.findMany({
      where: { providerId },
      select: { id: true, modelId: true }
    })
  } else if (modelIds && Array.isArray(modelIds)) {
    // 为指定的模型列表自动分组
    modelsToUpdate = await prisma.model.findMany({
      where: { id: { in: modelIds } },
      select: { id: true, modelId: true }
    })
  } else {
    return NextResponse.json(
      { error: 'Either providerId or modelIds is required' },
      { status: 400 }
    )
  }

  if (modelsToUpdate.length === 0) {
    return NextResponse.json(
      { error: 'No models found to update' },
      { status: 404 }
    )
  }

  // 使用事务批量更新模型分组
  const updatePromises = modelsToUpdate.map(model => {
    const categoryName = getAIModelCategoryName(model.modelId)
    return prisma.model.update({
      where: { id: model.id },
      data: { group: categoryName },
    })
  })

  await prisma.$transaction(updatePromises)

  return NextResponse.json({
    success: true,
    message: `Successfully auto-grouped ${modelsToUpdate.length} models`,
    updatedCount: modelsToUpdate.length
  })
}

export const POST = withAdminAuth(autoGroupHandler)

// 批量设置自定义分组
async function setCustomGroupHandler(
  request: NextRequest,
  userId: string
) {
  const data = await request.json()
  const { modelIds, groupName } = data

  if (!Array.isArray(modelIds) || !groupName) {
    return NextResponse.json(
      { error: 'modelIds array and groupName are required' },
      { status: 400 }
    )
  }

  // 检查模型是否存在
  const existingModels = await prisma.model.findMany({
    where: { id: { in: modelIds } },
    select: { id: true }
  })

  if (existingModels.length !== modelIds.length) {
    return NextResponse.json(
      { error: 'Some models not found' },
      { status: 404 }
    )
  }

  // 使用事务批量更新模型分组
  const updatePromises = modelIds.map((modelId: string) =>
    prisma.model.update({
      where: { id: modelId },
      data: { group: groupName.trim() },
    })
  )

  await prisma.$transaction(updatePromises)

  return NextResponse.json({
    success: true,
    message: `Successfully set custom group "${groupName}" for ${modelIds.length} models`,
    updatedCount: modelIds.length
  })
}

export const PATCH = withAdminAuth(setCustomGroupHandler)

// 清除模型分组（设置为null）
async function clearGroupsHandler(
  request: NextRequest,
  userId: string
) {
  const data = await request.json()
  const { modelIds } = data

  if (!Array.isArray(modelIds)) {
    return NextResponse.json(
      { error: 'modelIds array is required' },
      { status: 400 }
    )
  }

  // 使用事务批量清除模型分组
  const updatePromises = modelIds.map((modelId: string) =>
    prisma.model.update({
      where: { id: modelId },
      data: { group: null },
    })
  )

  await prisma.$transaction(updatePromises)

  return NextResponse.json({
    success: true,
    message: `Successfully cleared groups for ${modelIds.length} models`,
    updatedCount: modelIds.length
  })
}

export const DELETE = withAdminAuth(clearGroupsHandler)
