import { NextRequest, NextResponse } from 'next/server'
import { 
  createAccessCode, 
  getUserAccessCodes, 
  validateAccessCode,
  disableAccessCode,
  enableAccessCode
} from '@/lib/db/codes'

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

    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error handling access codes:', error)
    return NextResponse.json(
      { error: 'Failed to handle access codes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { createdBy, allowedModelIds, expiresAt, maxUses } = data

    if (!createdBy) {
      return NextResponse.json(
        { error: 'createdBy is required' },
        { status: 400 }
      )
    }

    const accessCode = await createAccessCode({
      createdBy,
      allowedModelIds,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxUses,
    })

    return NextResponse.json(accessCode, { status: 201 })
  } catch (error) {
    console.error('Error creating access code:', error)
    return NextResponse.json(
      { error: 'Failed to create access code' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json()
    const { codeId, userId, action } = data

    if (!codeId || !userId || !action) {
      return NextResponse.json(
        { error: 'codeId, userId, and action are required' },
        { status: 400 }
      )
    }

    let result
    if (action === 'disable') {
      result = await disableAccessCode(codeId, userId)
    } else if (action === 'enable') {
      result = await enableAccessCode(codeId, userId)
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "enable" or "disable"' },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating access code:', error)
    return NextResponse.json(
      { error: 'Failed to update access code' },
      { status: 500 }
    )
  }
}
