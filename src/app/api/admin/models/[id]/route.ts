import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { handleApiError, AppError } from '@/lib/error-handler'

// 获取单个模型
async function getModelHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: modelId } = await params

    // 获取模型信息
    const model = await prisma.model.findUnique({
      where: { id: modelId },
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

    if (!model) {
      throw AppError.notFound('模型不存在')
    }

    return NextResponse.json(model)
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/models/[id]')
  }
}

export const GET = withAdminAuth(getModelHandler)

// 更新单个模型
async function updateModelHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json()
    const { isEnabled, name, description, group } = data
    const { id: modelId } = await params

    // 更新模型
    const updatedModel = await prisma.model.update({
      where: { id: modelId },
      data: {
        ...(isEnabled !== undefined && { isEnabled }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(group !== undefined && { group }),
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
    return handleApiError(error, 'PATCH /api/admin/models/[id]')
  }
}

export const PATCH = withAdminAuth(updateModelHandler)

// 删除单个模型
async function deleteModelHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: modelId } = await params

    // 检查模型是否存在
    const existingModel = await prisma.model.findUnique({
      where: { id: modelId }
    })

    if (!existingModel) {
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

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/models/[id]')
  }
}

export const DELETE = withAdminAuth(deleteModelHandler)
