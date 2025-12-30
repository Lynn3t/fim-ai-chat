import { NextRequest, NextResponse } from 'next/server'
import {
  createInviteCode,
  createAccessCode,
  deleteInviteCode,
  deleteAccessCode,
  getUserInviteCodes,
  getUserAccessCodes
} from '@/lib/db/codes'
import { checkUserPermission } from '@/lib/auth'
import { getSystemSetting } from '@/lib/db/system-settings'
import { handleApiError, AppError } from '@/lib/error-handler'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { userId, type, ...codeData } = data

    if (!userId || !type) {
      throw AppError.badRequest('userId 和 type 不能为空')
    }

    if (type === 'invite') {
      // 检查创建邀请码权限
      const hasPermission = await checkUserPermission(userId, 'create_invite')
      if (!hasPermission) {
        throw AppError.forbidden('没有创建邀请码的权限')
      }

      // 检查用户已创建的邀请码数量限制
      const maxInviteCodes = await getSystemSetting('user_max_invite_codes') || 1
      const existingInviteCodes = await getUserInviteCodes(userId)

      if (existingInviteCodes.length >= maxInviteCodes) {
        throw AppError.badRequest(`最多只能创建 ${maxInviteCodes} 个邀请码`)
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
        throw AppError.forbidden('没有创建访问码的权限')
      }

      // 检查用户已创建的访问码数量限制
      const maxAccessCodes = await getSystemSetting('user_max_access_codes') || 10
      const existingAccessCodes = await getUserAccessCodes(userId)

      if (existingAccessCodes.length >= maxAccessCodes) {
        throw AppError.badRequest(`最多只能创建 ${maxAccessCodes} 个访问码`)
      }

      // 检查访问码最大用户数量限制
      const maxUsers = await getSystemSetting('access_code_max_users') || 10
      const requestedMaxUses = codeData.maxUses || maxUsers

      if (requestedMaxUses > maxUsers) {
        throw AppError.badRequest(`访问码最大用户数量不能超过 ${maxUsers}`)
      }

      const accessCode = await createAccessCode({
        createdBy: userId,
        allowedModelIds: codeData.allowedModelIds,
        expiresAt: codeData.expiresAt ? new Date(codeData.expiresAt) : undefined,
        maxUses: requestedMaxUses,
      })

      return NextResponse.json(accessCode, { status: 201 })

    } else {
      throw AppError.badRequest('无效的 type，请使用 "invite" 或 "access"')
    }

  } catch (error) {
    return handleApiError(error, 'POST /api/user/codes')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json()
    const { userId, codeId, type } = data

    if (!userId || !codeId || !type) {
      throw AppError.badRequest('userId, codeId 和 type 不能为空')
    }

    if (type === 'invite') {
      await deleteInviteCode(codeId, userId)
    } else if (type === 'access') {
      await deleteAccessCode(codeId, userId)
    } else {
      throw AppError.badRequest('无效的 type，请使用 "invite" 或 "access"')
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return handleApiError(error, 'DELETE /api/user/codes')
  }
}
