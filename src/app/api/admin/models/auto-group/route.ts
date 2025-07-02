import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkUserPermission } from '@/lib/auth'
import { getAIModelCategoryName } from '@/utils/aiModelUtils'

// 自动分组接口
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { adminUserId, providerId, modelIds } = data

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

  } catch (error) {
    console.error('Error auto-grouping models:', error)
    return NextResponse.json(
      { error: 'Failed to auto-group models' },
      { status: 500 }
    )
  }
}

// 批量设置自定义分组
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json()
    const { adminUserId, modelIds, groupName } = data

    if (!adminUserId || !Array.isArray(modelIds) || !groupName) {
      return NextResponse.json(
        { error: 'adminUserId, modelIds array, and groupName are required' },
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

  } catch (error) {
    console.error('Error setting custom group:', error)
    return NextResponse.json(
      { error: 'Failed to set custom group' },
      { status: 500 }
    )
  }
}

// 清除模型分组（设置为null）
export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json()
    const { adminUserId, modelIds } = data

    if (!adminUserId || !Array.isArray(modelIds)) {
      return NextResponse.json(
        { error: 'adminUserId and modelIds array are required' },
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

  } catch (error) {
    console.error('Error clearing model groups:', error)
    return NextResponse.json(
      { error: 'Failed to clear model groups' },
      { status: 500 }
    )
  }
}
