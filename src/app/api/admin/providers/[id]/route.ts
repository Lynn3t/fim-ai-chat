import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api-utils'
import { sanitizeProvider } from '@/lib/api-utils'

async function getProviderHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json(
      { error: 'Provider not found' },
      { status: 404 }
    )
  }

  // 过滤敏感信息
  return NextResponse.json(sanitizeProvider(provider))
}

export const GET = withAdminAuth(getProviderHandler)

async function updateProviderHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) {
  const data = await request.json()
  const { ...updateData } = data
  const { id: providerId } = await params

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
}

export const PATCH = withAdminAuth(updateProviderHandler)

async function deleteProviderHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: providerId } = await params

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
}

export const DELETE = withAdminAuth(deleteProviderHandler)
