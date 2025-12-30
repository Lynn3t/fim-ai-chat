import { NextRequest, NextResponse } from 'next/server'
import { getModels, createModel } from '@/lib/db/providers'
import { requireUser, type AuthUser } from '@/lib/auth-middleware'
import { createApiResponse } from '@/lib/api-utils'
import { handleApiError } from '@/lib/error-handler'

export const GET = requireUser(async (request: NextRequest, user: AuthUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')

    const models = await getModels(providerId || undefined)
    return createApiResponse(models)
  } catch (error) {
    return handleApiError(error, 'GET /api/models')
  }
})

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const model = await createModel(data)
    return NextResponse.json(model, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/models')
  }
}
