import { NextRequest, NextResponse } from 'next/server'
import { getConversationMessages } from '@/lib/db/conversations'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

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

    // 验证用户身份
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // 验证用户是否有权限访问此对话
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (conversation.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const messages = await getConversationMessages(id, {
      limit,
      offset,
      includeDeleted,
    })

    return NextResponse.json(messages)
  } catch (error) {
    logger.error('Error fetching conversation messages', error, 'API')
    return NextResponse.json(
      { error: 'Failed to fetch conversation messages' },
      { status: 500 }
    )
  }
} 