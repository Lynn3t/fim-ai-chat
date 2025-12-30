import { NextRequest, NextResponse } from 'next/server'
import { getUserConversations, createConversation, searchConversations } from '@/lib/db/conversations'
import { getCurrentUser } from '@/lib/auth-middleware';
import { handleApiError, AppError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    // 从JWT中获取用户
    const user = await getCurrentUser(request);
    if (!user) {
      throw AppError.unauthorized('请先登录');
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let conversations
    if (query) {
      conversations = await searchConversations(user.userId, query, limit)
    } else {
      conversations = await getUserConversations(user.userId, {
        includeArchived,
        limit,
        offset,
      })
    }

    return NextResponse.json(conversations)
  } catch (error) {
    return handleApiError(error, 'GET /api/conversations')
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const conversation = await createConversation(data)
    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/conversations')
  }
}
