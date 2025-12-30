import { NextRequest, NextResponse } from 'next/server'
import { getProviders, createProvider } from '@/lib/db/providers'
import { requireUser, type AuthUser } from '@/lib/auth-middleware'
import { sanitizeProviders, createApiResponse } from '@/lib/api-utils'
import { handleApiError } from '@/lib/error-handler'

export const GET = requireUser(async (request: NextRequest, user: AuthUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const includeDisabled = searchParams.get('includeDisabled') === 'true'

    const providers = await getProviders(true, !includeDisabled)

    // 过滤敏感信息（API密钥等）
    const sanitizedProviders = sanitizeProviders(providers)

    return createApiResponse(sanitizedProviders)
  } catch (error) {
    return handleApiError(error, 'GET /api/providers')
  }
})

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const provider = await createProvider(data)
    return NextResponse.json(provider, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/providers')
  }
}
