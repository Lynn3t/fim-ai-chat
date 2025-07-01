import { NextRequest, NextResponse } from 'next/server'
import { 
  checkChatPermissions, 
  checkGuestHostPermissions, 
  getUserChatConfig 
} from '@/lib/chat-permissions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const modelId = searchParams.get('modelId')
    const action = searchParams.get('action')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (action === 'config') {
      // 获取用户聊天配置
      const config = await getUserChatConfig(userId)
      return NextResponse.json(config)
    }

    if (action === 'guest-host') {
      // 检查访客的宿主用户权限
      const hostPermissions = await checkGuestHostPermissions(userId)
      return NextResponse.json(hostPermissions)
    }

    if (modelId) {
      // 检查特定模型的聊天权限
      const permissions = await checkChatPermissions(userId, modelId)
      return NextResponse.json(permissions)
    }

    // 获取基本聊天配置
    const config = await getUserChatConfig(userId)
    return NextResponse.json(config)

  } catch (error) {
    console.error('Error checking chat permissions:', error)
    return NextResponse.json(
      { error: 'Failed to check chat permissions' },
      { status: 500 }
    )
  }
}
