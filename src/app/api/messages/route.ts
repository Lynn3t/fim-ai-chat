import { NextRequest, NextResponse } from 'next/server'
import { getConversationMessages, createMessage } from '@/lib/db/conversations'
import { checkChatPermissions } from '@/lib/chat-permissions'
import { recordTokenUsage } from '@/lib/db/token-usage'
import { getCurrentUser } from '@/lib/auth-middleware'
import { handleApiError, AppError } from '@/lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    if (!conversationId) {
      throw AppError.badRequest('缺少 conversationId 参数')
    }

    const messages = await getConversationMessages(conversationId, {
      limit,
      offset,
      includeDeleted,
    })

    return NextResponse.json(messages)
  } catch (error) {
    return handleApiError(error, 'GET /api/messages')
  }
}

export async function POST(request: NextRequest) {
  try {
    // 从JWT中获取用户
    const user = await getCurrentUser(request)
    if (!user) {
      throw AppError.unauthorized('请先登录')
    }

    const data = await request.json()
    const {
      modelId,
      providerId,
      conversationId,
      role,
      content,
      rawContent,
      finishReason,
      tokenUsage,
      inputText,
      outputText,
      saveToDatabase = true, // 默认保存到数据库
    } = data

    if (!modelId || !providerId || !role || !content) {
      throw AppError.badRequest('缺少必要字段')
    }

    // 检查聊天权限
    const permissions = await checkChatPermissions(user.userId, modelId)
    if (!permissions.canChat) {
      throw AppError.forbidden(permissions.error || '没有聊天权限')
    }

    let message = null

    // 根据用户类型决定是否保存到数据库
    if (permissions.canSaveToDatabase && saveToDatabase) {
      try {
        message = await createMessage({
          conversationId,
          userId: user.userId,
          providerId,
          modelId,
          role,
          content,
          rawContent,
          finishReason,
          tokenUsage,
        })
      } catch (error) {
        // 如果是访客用户，createMessage会抛出错误，这是正常的
        if (error instanceof Error && error.message.includes('Guest')) {
          // Guest user message not saved to database
        } else {
          throw error
        }
      }
    }

    // 记录token使用量（所有用户都需要记录）
    if (role === 'assistant' && (tokenUsage || inputText || outputText)) {
      await recordTokenUsage({
        userId: user.userId,
        conversationId: permissions.canSaveToDatabase ? conversationId : undefined,
        messageId: message?.id,
        providerId,
        modelId,
        promptTokens: tokenUsage?.prompt_tokens,
        completionTokens: tokenUsage?.completion_tokens,
        totalTokens: tokenUsage?.total_tokens,
        inputText,
        outputText,
      })
    }

    // 返回消息（如果没有保存到数据库，返回临时对象）
    const responseMessage = message || {
      id: `temp_${Date.now()}`,
      conversationId,
      userId: user.userId,
      providerId,
      modelId,
      role,
      content,
      rawContent,
      isEdited: false,
      isDeleted: false,
      finishReason,
      tokenUsage,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return NextResponse.json(responseMessage, { status: 201 })

  } catch (error) {
    return handleApiError(error, 'POST /api/messages')
  }
}
