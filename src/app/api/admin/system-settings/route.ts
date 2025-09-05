import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api-utils'
import { 
  getAllSystemSettings, 
  updateSystemSettings, 
  getSystemSetting,
  setSystemSetting,
  DEFAULT_SYSTEM_SETTINGS
} from '@/lib/db/system-settings'

async function handleGet(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url)
    // Publicly allow fetching a single setting by key
    const key = searchParams.get('key')
    if (key) {
      const value = await getSystemSetting(key)
      return NextResponse.json({ key, value })
    }

    // 获取所有设置
    const settings = await getAllSystemSettings()
    
    // 添加设置描述信息
    const settingsWithMeta = Object.entries(settings).map(([key, value]) => {
      const defaultSetting = DEFAULT_SYSTEM_SETTINGS.find(s => s.key === key)
      return {
        key,
        value,
        type: defaultSetting?.type || typeof value,
        description: defaultSetting?.description || ''
      }
    })

    return NextResponse.json({
      settings: settingsWithMeta,
      raw: settings
    })

  } catch (error) {
    console.error('Error fetching system settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    )
  }
}

async function handlePost(request: NextRequest, userId: string) {
  try {
    const data = await request.json()
    const { key, value, type } = data

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'key and value are required' },
        { status: 400 }
      )
    }

    // 设置单个值
    const setting = await setSystemSetting(key, value, type)
    
    return NextResponse.json({
      success: true,
      setting: {
        key: setting.key,
        value: setting.value,
        type: setting.type,
        description: setting.description
      }
    })

  } catch (error) {
    console.error('Error setting system setting:', error)
    return NextResponse.json(
      { error: 'Failed to set system setting' },
      { status: 500 }
    )
  }
}

async function handlePatch(request: NextRequest, userId: string) {
  try {
    const data = await request.json()
    const { settings } = data

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'settings object is required' },
        { status: 400 }
      )
    }

    // 批量更新设置
    await updateSystemSettings(settings)
    
    // 返回更新后的所有设置
    const updatedSettings = await getAllSystemSettings()
    
    return NextResponse.json({
      success: true,
      message: 'System settings updated successfully',
      settings: updatedSettings
    })

  } catch (error) {
    console.error('Error updating system settings:', error)
    return NextResponse.json(
      { error: 'Failed to update system settings' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handleGet)
export const POST = withAdminAuth(handlePost)
export const PATCH = withAdminAuth(handlePatch)
