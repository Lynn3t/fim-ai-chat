import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkUserPermission } from '@/lib/auth'

// 获取单个模型
export async function GET(
  request: NextRequest,
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
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(model)
  } catch (error) {
    console.error('Error fetching model:', error)
    return NextResponse.json(
      { error: 'Failed to fetch model' },
      { status: 500 }
    )
  }
}

// 更新单个模型
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json()
    const { adminUserId, isEnabled, name, description, group } = data
    const { id: modelId } = await params

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
    console.error('Error updating model:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 删除单个模型
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const adminUserId = searchParams.get('adminUserId')
    const { id: modelId } = await params

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

  } catch (error) {
    console.error('Error deleting model:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
