import { NextRequest, NextResponse } from 'next/server'
import { checkUserPermission } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: codeId } = params
    const { searchParams } = new URL(request.url)
    const adminUserId = searchParams.get('adminUserId')

    if (!adminUserId) {
      return NextResponse.json(
        { error: 'adminUserId is required' },
        { status: 400 }
      )
    }

    // 检查管理员权限
    const hasPermission = await checkUserPermission(adminUserId, 'admin_panel')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // 检查邀请码是否存在
    const inviteCode = await prisma.inviteCode.findUnique({
      where: { id: codeId }
    })

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code not found' },
        { status: 404 }
      )
    }

    // 删除邀请码
    await prisma.inviteCode.delete({
      where: { id: codeId }
    })

    return NextResponse.json({ 
      success: true,
      message: `Invite code "${inviteCode.code}" deleted successfully`
    })

  } catch (error) {
    console.error('Error deleting invite code:', error)
    return NextResponse.json(
      { error: 'Failed to delete invite code' },
      { status: 500 }
    )
  }
} 