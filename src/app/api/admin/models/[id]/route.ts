import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api-utils'

// 获取单个模型
async function getModelHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json(
      { error: 'Model not found' },
      { status: 404 }
    )
  }

  return NextResponse.json(model)
}

export const GET = withAdminAuth(getModelHandler)

// 更新单个模型
async function updateModelHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) {
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
}

export const PATCH = withAdminAuth(updateModelHandler)

// 删除单个模型
async function deleteModelHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: modelId } = await params

  // 检查模型是否存在
  const existingModel = await prisma.model.findUnique({
    where: { id: modelId }
  })

  if (!existingModel) {
    return NextResponse.json(
      { error: 'Model not found' },
      { status: 404 }
    )
  }

  // 检查是否有相关的对话或消息
  const conversationCount = await prisma.conversation.count({
    where: { modelId }
  })

  const messageCount = await prisma.message.count({
    where: { modelId }
  })

  if (conversationCount > 0 || messageCount > 0) {
    return NextResponse.json(
      { error: 'Cannot delete model with existing conversations or messages' },
      { status: 400 }
    )
  }

  // 删除模型
  await prisma.model.delete({
    where: { id: modelId }
  })

  return NextResponse.json({ success: true })
}

export const DELETE = withAdminAuth(deleteModelHandler)
