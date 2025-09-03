import { NextRequest, NextResponse } from 'next/server'
import { getUserConversations, createConversation, searchConversations } from '@/lib/db/conversations'
import { getUserFromRequest } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    // 从JWT中获取用户ID
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let conversations
    if (query) {
      conversations = await searchConversations(userId, query, limit)
    } else {
      conversations = await getUserConversations(userId, {
        includeArchived,
        limit,
        offset,
      })
    }

    return NextResponse.json(conversations)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const conversation = await createConversation(data)
    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
