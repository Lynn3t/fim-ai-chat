import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkUserPermission } from '@/lib/db/permissions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminUserId = searchParams.get('adminUserId')

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

    // 获取所有提供商
    const providers = await prisma.provider.findMany({
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
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(providers)

  } catch (error) {
    console.error('Error fetching providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { adminUserId, name, displayName, baseUrl, apiKey, icon, description } = data

    if (!adminUserId || !name || !displayName) {
      return NextResponse.json(
        { error: 'adminUserId, name, and displayName are required' },
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

    // 检查提供商名称是否已存在
    const existingProvider = await prisma.provider.findUnique({
      where: { name }
    })

    if (existingProvider) {
      return NextResponse.json(
        { error: 'Provider with this name already exists' },
        { status: 400 }
      )
    }

    // 获取当前最大排序值
    const maxOrderProvider = await prisma.provider.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    // 创建新提供商
    const newProvider = await prisma.provider.create({
      data: {
        name,
        displayName,
        baseUrl,
        apiKey,
        icon,
        description,
        isEnabled: true,
        order: (maxOrderProvider?.order || 0) + 1,
      },
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

    return NextResponse.json(newProvider, { status: 201 })

  } catch (error) {
    console.error('Error creating provider:', error)
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    )
  }
}
