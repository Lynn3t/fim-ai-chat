import { NextRequest, NextResponse } from 'next/server'
import { deleteMessage, getMessageById, updateMessage } from '@/lib/db/conversations'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params
    
    if (!id || !messageId) {
      return NextResponse.json(
        { error: 'Missing conversation id or message id' },
        { status: 400 }
      )
    }

    // 检查消息是否属于该对话
    const message = await getMessageById(messageId)
    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    if (message.conversationId !== id) {
      return NextResponse.json(
        { error: 'Message does not belong to this conversation' },
        { status: 403 }
      )
    }

    // 软删除消息
    const deletedMessage = await deleteMessage(messageId)
    return NextResponse.json(deletedMessage)
  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params
    
    if (!id || !messageId) {
      return NextResponse.json(
        { error: 'Missing conversation id or message id' },
        { status: 400 }
      )
    }

    const data = await request.json()
    const { content } = data

    // 检查消息是否属于该对话
    const message = await getMessageById(messageId)
    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    if (message.conversationId !== id) {
      return NextResponse.json(
        { error: 'Message does not belong to this conversation' },
        { status: 403 }
      )
    }

    // 更新消息
    const updatedMessage = await updateMessage(messageId, {
      content,
      isEdited: true
    })

    return NextResponse.json(updatedMessage)
  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    )
  }
} 