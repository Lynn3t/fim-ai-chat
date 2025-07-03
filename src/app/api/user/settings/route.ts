import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/api-utils'
import { getUserSettings, upsertUserSettings, updateUserDefaultModel } from '@/lib/db/users'

// 获取用户设置
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const settings = await getUserSettings(userId)
    
    return NextResponse.json(settings || {
      defaultModelId: null,
      theme: 'light',
      language: 'zh-CN',
      enableMarkdown: true,
      enableLatex: true,
      enableCodeHighlight: true,
      messagePageSize: 50,
    })
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    )
  }
}

// 更新用户设置
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const {
      defaultModelId,
      theme,
      language,
      enableMarkdown,
      enableLatex,
      enableCodeHighlight,
      messagePageSize,
    } = data

    const settings = await upsertUserSettings(userId, {
      defaultModelId,
      theme,
      language,
      enableMarkdown,
      enableLatex,
      enableCodeHighlight,
      messagePageSize,
    })

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      { error: 'Failed to update user settings' },
      { status: 500 }
    )
  }
}

// 更新默认模型（快捷接口）
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { defaultModelId } = await request.json()
    
    if (!defaultModelId) {
      return NextResponse.json(
        { error: 'defaultModelId is required' },
        { status: 400 }
      )
    }

    const settings = await updateUserDefaultModel(userId, defaultModelId)

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error('Error updating default model:', error)
    return NextResponse.json(
      { error: 'Failed to update default model' },
      { status: 500 }
    )
  }
}
