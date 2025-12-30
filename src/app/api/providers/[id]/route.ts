import { NextRequest, NextResponse } from 'next/server'
import { getProviderById, updateProvider, deleteProvider } from '@/lib/db/providers'
import { handleApiError, AppError } from '@/lib/error-handler'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const provider = await getProviderById(id)
    if (!provider) {
      throw AppError.notFound('提供商不存在')
    }
    return NextResponse.json(provider)
  } catch (error) {
    return handleApiError(error, 'GET /api/providers/[id]')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json()
    const { id } = await params
    const provider = await updateProvider(id, data)
    return NextResponse.json(provider)
  } catch (error) {
    return handleApiError(error, 'PUT /api/providers/[id]')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteProvider(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/providers/[id]')
  }
}
