import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-middleware'
import { getUserSettings, upsertUserSettings, updateUserDefaultModel } from '@/lib/db/users'
import { prisma } from '@/lib/prisma'
import { handleApiError, AppError } from '@/lib/error-handler'

// 获取用户设置
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      throw AppError.unauthorized('请先登录')
    }

    const settings = await getUserSettings(user.userId)

    return NextResponse.json(settings || {
      defaultModelId: null,
      theme: 'light',
      language: 'zh-CN',
      enableMarkdown: true,
      enableLatex: true,
      enableCodeHighlight: true,
      messagePageSize: 50,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/user/settings')
  }
}

// 更新用户设置
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      throw AppError.unauthorized('请先登录')
    }

    const data = await request.json()
    const {
      defaultModelId,
      theme,
      language,
      enableMarkdown,
      enableLatex,
      enableCodeHighlight,
      messagePageSize,
    } = data

    const settings = await upsertUserSettings(user.userId, {
      defaultModelId,
      theme,
      language,
      enableMarkdown,
      enableLatex,
      enableCodeHighlight,
      messagePageSize,
    })

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/user/settings')
  }
}

// 更新默认模型（快捷接口）
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      throw AppError.unauthorized('请先登录')
    }

    const { defaultModelId } = await request.json()

    if (!defaultModelId) {
      throw AppError.badRequest('defaultModelId 不能为空')
    }

    // 检查模型是否存在且用户有权限使用
    const model = await prisma.model.findUnique({
      where: { id: defaultModelId },
    });

    if (!model) {
      throw AppError.notFound('模型不存在')
    }

    // 更新用户默认模型设置
    const settings = await updateUserDefaultModel(user.userId, defaultModelId)

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/user/settings')
  }
}
