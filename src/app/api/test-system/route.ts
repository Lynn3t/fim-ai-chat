import { NextRequest, NextResponse } from 'next/server'
import { registerUser, loginUser } from '@/lib/auth'
import { validateInviteCode, validateAccessCode } from '@/lib/db/codes'
import { ADMIN_INVITE_CODE } from '@/lib/codes'
import { getUserChatConfig } from '@/lib/chat-permissions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'admin-invite') {
      // 测试管理员邀请码
      const validation = await validateInviteCode(ADMIN_INVITE_CODE)
      return NextResponse.json({
        adminInviteCode: ADMIN_INVITE_CODE,
        isValid: validation.valid,
        error: validation.error,
      })
    }

    if (action === 'system-status') {
      // 系统状态检查
      const status = {
        database: 'connected',
        adminInviteCode: ADMIN_INVITE_CODE,
        timestamp: new Date().toISOString(),
        features: {
          userManagement: true,
          inviteCodes: true,
          accessCodes: true,
          tokenTracking: true,
          chatPermissions: true,
          adminPanel: true,
        },
      }
      return NextResponse.json(status)
    }

    return NextResponse.json({
      message: 'FimAI Chat System Test API',
      availableActions: [
        'admin-invite - Test admin invite code',
        'system-status - Check system status',
      ],
    })

  } catch (error) {
    console.error('Test system error:', error)
    return NextResponse.json(
      { error: 'Test system failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { action, ...testData } = data

    if (action === 'register-admin') {
      // 测试管理员注册
      const result = await registerUser({
        username: testData.username || 'admin',
        email: testData.email,
        inviteCode: ADMIN_INVITE_CODE,
      })

      return NextResponse.json({
        success: result.success,
        user: result.user ? {
          id: result.user.id,
          username: result.user.username,
          role: result.user.role,
        } : null,
        error: result.error,
      })
    }

    if (action === 'register-user') {
      // 测试普通用户注册
      const result = await registerUser({
        username: testData.username,
        email: testData.email,
        inviteCode: testData.inviteCode,
      })

      return NextResponse.json({
        success: result.success,
        user: result.user ? {
          id: result.user.id,
          username: result.user.username,
          role: result.user.role,
        } : null,
        error: result.error,
      })
    }

    if (action === 'register-guest') {
      // 测试访客注册
      const result = await registerUser({
        username: testData.username,
        accessCode: testData.accessCode,
      })

      return NextResponse.json({
        success: result.success,
        user: result.user ? {
          id: result.user.id,
          username: result.user.username,
          role: result.user.role,
          hostUserId: result.user.hostUserId,
        } : null,
        error: result.error,
      })
    }

    if (action === 'login') {
      // 测试用户登录
      const result = await loginUser(testData.username)

      if (result.success && result.user) {
        const chatConfig = await getUserChatConfig(result.user.id)
        
        return NextResponse.json({
          success: result.success,
          user: {
            id: result.user.id,
            username: result.user.username,
            role: result.user.role,
            isActive: result.user.isActive,
          },
          chatConfig,
          error: result.error,
        })
      }

      return NextResponse.json({
        success: result.success,
        error: result.error,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Test system POST error:', error)
    return NextResponse.json(
      { error: 'Test system failed' },
      { status: 500 }
    )
  }
}
