import { NextRequest, NextResponse } from 'next/server'
import {
  createInviteCode,
  getUserInviteCodes,
  validateInviteCode
} from '@/lib/db/codes'
import { handleApiError, AppError } from '@/lib/error-handler'

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

    throw AppError.badRequest('缺少必要参数')
  } catch (error) {
    return handleApiError(error, 'GET /api/codes/invite')
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { createdBy, expiresAt, maxUses } = data

    if (!createdBy) {
      throw AppError.badRequest('缺少 createdBy 参数')
    }

    const inviteCode = await createInviteCode({
      createdBy,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxUses,
    })

    return NextResponse.json(inviteCode, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/codes/invite')
  }
}
