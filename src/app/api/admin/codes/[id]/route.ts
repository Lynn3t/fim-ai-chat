import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { handleApiError, AppError } from '@/lib/error-handler'

async function deleteCodeHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: codeId } = await params

    // 检查邀请码是否存在
    const inviteCode = await prisma.inviteCode.findUnique({
      where: { id: codeId }
    })

    if (!inviteCode) {
      throw AppError.notFound('邀请码不存在')
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
    return handleApiError(error, 'DELETE /api/admin/codes/[id]')
  }
}

export const DELETE = withAdminAuth(deleteCodeHandler)
