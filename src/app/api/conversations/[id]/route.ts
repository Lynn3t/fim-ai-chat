import { NextRequest, NextResponse } from 'next/server'
import {
  getConversationById,
  updateConversation,
  deleteConversation,
} from '@/lib/db/conversations'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, AppError } from '@/lib/error-handler'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      throw AppError.badRequest('缺少对话 ID')
    }

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

    const conversationDetails = await getConversationById(id)
    return NextResponse.json(conversationDetails)
  } catch (error) {
    return handleApiError(error, 'GET /api/conversations/[id]')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      throw AppError.badRequest('缺少对话 ID')
    }

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

    // 验证用户是否有权限修改此对话
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!conversation) {
      throw AppError.notFound('对话不存在')
    }

    if (conversation.userId !== decoded.userId) {
      throw AppError.forbidden('无权修改此对话')
    }

    const data = await request.json()
    const { title, isArchived, isPinned } = data

    const updatedConversation = await updateConversation(id, {
      ...(title !== undefined && { title }),
      ...(isArchived !== undefined && { isArchived }),
      ...(isPinned !== undefined && { isPinned }),
    })

    return NextResponse.json(updatedConversation)
  } catch (error) {
    return handleApiError(error, 'PATCH /api/conversations/[id]')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      throw AppError.badRequest('缺少对话 ID')
    }

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

    // 验证用户是否有权限删除此对话
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!conversation) {
      throw AppError.notFound('对话不存在')
    }

    if (conversation.userId !== decoded.userId) {
      throw AppError.forbidden('无权删除此对话')
    }

    const deletedConversation = await deleteConversation(id)
    return NextResponse.json(deletedConversation)
  } catch (error) {
    return handleApiError(error, 'DELETE /api/conversations/[id]')
  }
}
