import { NextRequest, NextResponse } from 'next/server'
import { getConversationMessages, createMessage } from '@/lib/db/conversations'
import { checkChatPermissions } from '@/lib/chat-permissions'
import { recordTokenUsage } from '@/lib/db/token-usage'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      )
    }

    const messages = await getConversationMessages(conversationId, {
      limit,
      offset,
      includeDeleted,
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      userId,
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

    if (!userId || !modelId || !providerId || !role || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 检查聊天权限
    const permissions = await checkChatPermissions(userId, modelId)
    if (!permissions.canChat) {
      return NextResponse.json(
        { error: permissions.error || 'No permission to chat' },
        { status: 403 }
      )
    }

    let message = null

    // 根据用户类型决定是否保存到数据库
    if (permissions.canSaveToDatabase && saveToDatabase) {
      try {
        message = await createMessage({
          conversationId,
          userId,
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
          console.log('Guest user message not saved to database')
        } else {
          throw error
        }
      }
    }

    // 记录token使用量（所有用户都需要记录）
    if (role === 'assistant' && (tokenUsage || inputText || outputText)) {
      await recordTokenUsage({
        userId,
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
      userId,
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
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
}
