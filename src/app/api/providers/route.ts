import { NextRequest, NextResponse } from 'next/server'
import { getProviders, createProvider } from '@/lib/db/providers'
import { withAuth, sanitizeProviders, createApiResponse, createErrorResponse } from '@/lib/api-utils'

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const { searchParams } = new URL(request.url)
  const includeDisabled = searchParams.get('includeDisabled') === 'true'

  const providers = await getProviders(true, !includeDisabled)

  // 过滤敏感信息（API密钥等）
  const sanitizedProviders = sanitizeProviders(providers)

  return createApiResponse(sanitizedProviders)
})

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const provider = await createProvider(data)
    return NextResponse.json(provider, { status: 201 })
  } catch (error) {
    console.error('Error creating provider:', error)
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    )
  }
}
