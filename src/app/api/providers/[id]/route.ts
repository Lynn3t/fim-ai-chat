import { NextRequest, NextResponse } from 'next/server'
import { getProviderById, updateProvider, deleteProvider } from '@/lib/db/providers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const provider = await getProviderById(id)
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(provider)
  } catch (error) {
    console.error('Error fetching provider:', error)
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    )
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
    console.error('Error updating provider:', error)
    return NextResponse.json(
      { error: 'Failed to update provider' },
      { status: 500 }
    )
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
    console.error('Error deleting provider:', error)
    return NextResponse.json(
      { error: 'Failed to delete provider' },
      { status: 500 }
    )
  }
}
