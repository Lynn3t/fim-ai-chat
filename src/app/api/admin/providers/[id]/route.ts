import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkUserPermission } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json()
    const { adminUserId, ...updateData } = data
    const { id: providerId } = await params

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

    // 如果更新名称，检查是否与其他提供商冲突
    if (updateData.name && updateData.name !== provider.name) {
      const existingProvider = await prisma.provider.findUnique({
        where: { name: updateData.name }
      })

      if (existingProvider) {
        return NextResponse.json(
          { error: 'Provider with this name already exists' },
          { status: 400 }
        )
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
    console.error('Error updating provider:', error)
    return NextResponse.json(
      { error: 'Failed to update provider' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const adminUserId = searchParams.get('adminUserId')
    const { id: providerId } = await params

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

    // 检查提供商是否存在
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        models: true,
      },
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
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
    console.error('Error deleting provider:', error)
    return NextResponse.json(
      { error: 'Failed to delete provider' },
      { status: 500 }
    )
  }
}
