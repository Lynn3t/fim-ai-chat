import { NextRequest, NextResponse } from 'next/server'
import { 
  recordTokenUsage, 
  getUserTokenStats, 
  getUserTokenHistory 
} from '@/lib/db/token-usage'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (action === 'history') {
      // 获取详细使用记录
      const history = await getUserTokenHistory(userId, {
        limit,
        offset,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      })
      return NextResponse.json(history)
    } else {
      // 获取统计数据
      const stats = await getUserTokenStats(
        userId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      )
      return NextResponse.json(stats)
    }

  } catch (error) {
    console.error('Error fetching token usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch token usage' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      userId,
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

    if (!userId || !providerId || !modelId) {
      return NextResponse.json(
        { error: 'userId, providerId, and modelId are required' },
        { status: 400 }
      )
    }

    const tokenUsage = await recordTokenUsage({
      userId,
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
    console.error('Error recording token usage:', error)
    return NextResponse.json(
      { error: 'Failed to record token usage' },
      { status: 500 }
    )
  }
}
