import { NextRequest, NextResponse } from 'next/server'
import { 
  createInviteCode, 
  createAccessCode, 
  deleteInviteCode, 
  deleteAccessCode 
} from '@/lib/db/codes'
import { checkUserPermission } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { userId, type, ...codeData } = data

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'userId and type are required' },
        { status: 400 }
      )
    }

    if (type === 'invite') {
      // 检查创建邀请码权限
      const hasPermission = await checkUserPermission(userId, 'create_invite')
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'No permission to create invite codes' },
          { status: 403 }
        )
      }

      const inviteCode = await createInviteCode({
        createdBy: userId,
        expiresAt: codeData.expiresAt ? new Date(codeData.expiresAt) : undefined,
        maxUses: codeData.maxUses,
      })

      return NextResponse.json(inviteCode, { status: 201 })

    } else if (type === 'access') {
      // 检查创建访问码权限
      const hasPermission = await checkUserPermission(userId, 'create_access')
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'No permission to create access codes' },
          { status: 403 }
        )
      }

      const accessCode = await createAccessCode({
        createdBy: userId,
        allowedModelIds: codeData.allowedModelIds,
        expiresAt: codeData.expiresAt ? new Date(codeData.expiresAt) : undefined,
        maxUses: codeData.maxUses,
      })

      return NextResponse.json(accessCode, { status: 201 })

    } else {
      return NextResponse.json(
        { error: 'Invalid code type. Use "invite" or "access"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error creating code:', error)
    return NextResponse.json(
      { error: 'Failed to create code' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json()
    const { userId, codeId, type } = data

    if (!userId || !codeId || !type) {
      return NextResponse.json(
        { error: 'userId, codeId, and type are required' },
        { status: 400 }
      )
    }

    if (type === 'invite') {
      await deleteInviteCode(codeId, userId)
    } else if (type === 'access') {
      await deleteAccessCode(codeId, userId)
    } else {
      return NextResponse.json(
        { error: 'Invalid code type. Use "invite" or "access"' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting code:', error)
    return NextResponse.json(
      { error: 'Failed to delete code' },
      { status: 500 }
    )
  }
}
