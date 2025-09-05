import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api-utils'

async function deleteCodeHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  const { id: codeId } = params

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
}

export const DELETE = withAdminAuth(deleteCodeHandler) 