import { NextRequest, NextResponse } from 'next/server'
import { 
  createInviteCode, 
  getUserInviteCodes, 
  validateInviteCode 
} from '@/lib/db/codes'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const code = searchParams.get('code')

    if (code) {
      // 验证邀请码
      const result = await validateInviteCode(code)
      return NextResponse.json(result)
    }

    if (userId) {
      // 获取用户的邀请码列表
      const inviteCodes = await getUserInviteCodes(userId)
      return NextResponse.json(inviteCodes)
    }

    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error handling invite codes:', error)
    return NextResponse.json(
      { error: 'Failed to handle invite codes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { createdBy, expiresAt, maxUses } = data

    if (!createdBy) {
      return NextResponse.json(
        { error: 'createdBy is required' },
        { status: 400 }
      )
    }

    const inviteCode = await createInviteCode({
      createdBy,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxUses,
    })

    return NextResponse.json(inviteCode, { status: 201 })
  } catch (error) {
    console.error('Error creating invite code:', error)
    return NextResponse.json(
      { error: 'Failed to create invite code' },
      { status: 500 }
    )
  }
}
