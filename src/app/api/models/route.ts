import { NextRequest, NextResponse } from 'next/server'
import { getModels, createModel } from '@/lib/db/providers'
import { withAuth, createApiResponse } from '@/lib/api-utils'

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const { searchParams } = new URL(request.url)
  const providerId = searchParams.get('providerId')

  const models = await getModels(providerId || undefined)
  return createApiResponse(models)
})

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const model = await createModel(data)
    return NextResponse.json(model, { status: 201 })
  } catch (error) {
    console.error('Error creating model:', error)
    return NextResponse.json(
      { error: 'Failed to create model' },
      { status: 500 }
    )
  }
}
