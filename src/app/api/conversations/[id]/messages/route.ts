import { NextRequest, NextResponse } from 'next/server'
import { getConversationMessages } from '@/lib/db/conversations'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, AppError } from '@/lib/error-handler'

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
      throw AppError.unauthorized('请先登录')
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded) {
      throw AppError.unauthorized('登录已过期')
    }

    // 验证用户是否有权限访问此对话
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!conversation) {
      throw AppError.notFound('对话不存在')
    }

    if (conversation.userId !== decoded.userId) {
      throw AppError.forbidden('无权访问此对话')
    }

    const messages = await getConversationMessages(id, {
      limit,
      offset,
      includeDeleted,
    })

    return NextResponse.json(messages)
  } catch (error) {
    return handleApiError(error, 'GET /api/conversations/[id]/messages')
  }
}
