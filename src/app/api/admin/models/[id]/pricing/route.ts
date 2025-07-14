import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkUserPermission } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const modelId = params.id
    
    const pricing = await prisma.modelPricing.findUnique({
      where: { modelId }
    })

    return NextResponse.json(pricing || null)

  } catch (error) {
    console.error('Error fetching model pricing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch model pricing' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUserId, pricingType, inputPrice, cachedInputPrice, outputPrice, usagePrice } = await request.json()

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

    const modelId = params.id

    // 检查模型是否存在
    const model = await prisma.model.findUnique({
      where: { id: modelId }
    })

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }

    // 创建或更新模型价格
    const pricing = await prisma.modelPricing.upsert({
      where: { modelId },
      update: {
        pricingType,
        inputPrice,
        cachedInputPrice,
        outputPrice,
        usagePrice,
      },
      create: {
        modelId,
        pricingType,
        inputPrice,
        cachedInputPrice,
        outputPrice,
        usagePrice,
      },
    })

    return NextResponse.json(pricing)

  } catch (error) {
    console.error('Error updating model pricing:', error)
    return NextResponse.json(
      { error: 'Failed to update model pricing' },
      { status: 500 }
    )
  }
} 