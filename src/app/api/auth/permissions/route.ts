import { NextRequest, NextResponse } from 'next/server'
import { checkUserPermission, getUserAllowedModels } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (action) {
      // 检查特定权限
      const hasPermission = await checkUserPermission(
        userId, 
        action as 'chat' | 'create_invite' | 'create_access' | 'admin_panel'
      )
      return NextResponse.json({ hasPermission })
    } else {
      // 获取用户允许的模型列表
      const allowedModels = await getUserAllowedModels(userId)
      return NextResponse.json({ allowedModels })
    }

  } catch (error) {
    console.error('Permission check error:', error)
    return NextResponse.json(
      { error: 'Failed to check permissions' },
      { status: 500 }
    )
  }
}
