import { NextRequest, NextResponse } from 'next/server'
import {
  createAccessCode,
  getUserAccessCodes,
  validateAccessCode,
  disableAccessCode,
  enableAccessCode
} from '@/lib/db/codes'
import { handleApiError, AppError } from '@/lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const code = searchParams.get('code')

    if (code) {
      // 验证访问码
      const result = await validateAccessCode(code)
      return NextResponse.json(result)
    }

    if (userId) {
      // 获取用户的访问码列表
      const accessCodes = await getUserAccessCodes(userId)
      return NextResponse.json(accessCodes)
    }

    throw AppError.badRequest('缺少必要参数')
  } catch (error) {
    return handleApiError(error, 'GET /api/codes/access')
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { createdBy, allowedModelIds, expiresAt, maxUses } = data

    if (!createdBy) {
      throw AppError.badRequest('缺少 createdBy 参数')
    }

    const accessCode = await createAccessCode({
      createdBy,
      allowedModelIds,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxUses,
    })

    return NextResponse.json(accessCode, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/codes/access')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json()
    const { codeId, userId, action } = data

    if (!codeId || !userId || !action) {
      throw AppError.badRequest('缺少 codeId, userId 或 action 参数')
    }

    let result
    if (action === 'disable') {
      result = await disableAccessCode(codeId, userId)
    } else if (action === 'enable') {
      result = await enableAccessCode(codeId, userId)
    } else {
      throw AppError.badRequest('无效的操作，请使用 "enable" 或 "disable"')
    }

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error, 'PATCH /api/codes/access')
  }
}
