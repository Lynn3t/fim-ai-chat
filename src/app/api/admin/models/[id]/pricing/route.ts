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

    const { id: modelId } = await params
    
    // 直接从Model表中获取价格设置
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      select: {
        pricingType: true,
        inputPrice: true,
        outputPrice: true,
        usagePrice: true
      }
    })

    // 如果没有找到模型，返回默认配置
    if (!model) {
      return NextResponse.json({
        id: null,
        modelId: modelId,
        pricingType: 'token',
        inputPrice: 2.0, // $2.00 / 1M tokens
        outputPrice: 8.0, // $8.00 / 1M tokens
        usagePrice: null,
        createdAt: null,
        updatedAt: null,
        isDefault: true, // 标记为默认值
      })
    }

    // 格式化为前端期望的结构
    return NextResponse.json({
      id: modelId,
      modelId: modelId,
      pricingType: model.pricingType,
      inputPrice: model.inputPrice,
      outputPrice: model.outputPrice,
      usagePrice: model.usagePrice,
    })

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
    const { adminUserId, pricingType, inputPrice, outputPrice, usagePrice } = await request.json()

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

    const { id: modelId } = await params

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

    // 直接更新Model表中的价格设置
    const updatedModel = await prisma.model.update({
      where: { id: modelId },
      data: {
        pricingType: pricingType || 'token',
        inputPrice: inputPrice !== undefined ? inputPrice : 2.0,
        outputPrice: outputPrice !== undefined ? outputPrice : 8.0,
        usagePrice: usagePrice || null,
      },
      select: {
        id: true,
        modelId: true,
        pricingType: true,
        inputPrice: true,
        outputPrice: true,
        usagePrice: true
      }
    })

    // 格式化为前端期望的结构
    return NextResponse.json({
      id: updatedModel.id,
      modelId: updatedModel.id,
      pricingType: updatedModel.pricingType,
      inputPrice: updatedModel.inputPrice,
      outputPrice: updatedModel.outputPrice,
      usagePrice: updatedModel.usagePrice,
    })

  } catch (error) {
    console.error('Error updating model pricing:', error)
    return NextResponse.json(
      { error: 'Failed to update model pricing' },
      { status: 500 }
    )
  }
} 