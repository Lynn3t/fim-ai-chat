import { NextRequest, NextResponse } from 'next/server'
import {
  recordTokenUsage,
  getUserTokenStats,
  getUserTokenHistory
} from '@/lib/db/token-usage'
import { requireUser, type AuthUser } from '@/lib/auth-middleware'
import { handleApiError, AppError } from '@/lib/error-handler'

async function _GET(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (action === 'history') {
      // 获取详细使用记录
      const history = await getUserTokenHistory(user.userId, {
        limit,
        offset,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      })
      return NextResponse.json(history)
    } else {
      // 获取统计数据
      const stats = await getUserTokenStats(
        user.userId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      )
      return NextResponse.json(stats)
    }

  } catch (error) {
    return handleApiError(error, 'GET /api/token-usage')
  }
}

// 使用requireUser装饰器包装
export const GET = requireUser(_GET)

async function _POST(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()
    const {
      conversationId,
      messageId,
      providerId,
      modelId,
      promptTokens,
      completionTokens,
      totalTokens,
      inputText,
      outputText,
    } = data

    if (!providerId || !modelId) {
      throw AppError.badRequest('缺少 providerId 或 modelId 参数')
    }

    const tokenUsage = await recordTokenUsage({
      userId: user.userId,
      conversationId,
      messageId,
      providerId,
      modelId,
      promptTokens,
      completionTokens,
      totalTokens,
      inputText,
      outputText,
    })

    return NextResponse.json(tokenUsage, { status: 201 })

  } catch (error) {
    return handleApiError(error, 'POST /api/token-usage')
  }
}

// 使用requireUser装饰器包装
export const POST = requireUser(_POST)
