import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkUserPermission } from '@/lib/auth'

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

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { adminUserId, providers } = data

    if (!adminUserId) {
      return NextResponse.json(
        { error: 'adminUserId is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(providers)) {
      return NextResponse.json(
        { error: 'providers array is required' },
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

    console.log('Updating provider order:', providers);

    // 批量更新提供商排序
    const updatePromises = providers.map((provider: { id: string; order: number }) => {
      console.log(`Updating provider ${provider.id} to order ${provider.order}`);
      return prisma.provider.update({
        where: { id: provider.id },
        data: { order: provider.order },
      });
    });

    await Promise.all(updatePromises);

    console.log('Provider order update completed successfully');
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating provider order:', error)
    return NextResponse.json(
      { error: 'Failed to update provider order' },
      { status: 500 }
    )
  }
}
