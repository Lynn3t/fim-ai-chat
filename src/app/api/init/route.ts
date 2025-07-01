import { NextRequest, NextResponse } from 'next/server'
import { initializeSystemSettings } from '@/lib/db/system-settings'

export async function POST(request: NextRequest) {
  try {
    // 初始化系统设置
    await initializeSystemSettings()
    
    return NextResponse.json({
      success: true,
      message: 'System initialized successfully'
    })
  } catch (error) {
    console.error('Error initializing system:', error)
    return NextResponse.json(
      { error: 'Failed to initialize system' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // 允许通过 GET 请求也能初始化，方便调试
  return POST(request)
}
