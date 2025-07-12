import { NextRequest, NextResponse } from 'next/server'
import { getConversationMessages } from '@/lib/db/conversations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    const messages = await getConversationMessages(id, {
      limit,
      offset,
      includeDeleted,
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching conversation messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation messages' },
      { status: 500 }
    )
  }
} 