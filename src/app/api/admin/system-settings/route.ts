import { NextRequest, NextResponse } from 'next/server'
import { checkUserPermission } from '@/lib/auth'
import { 
  getAllSystemSettings, 
  updateSystemSettings, 
  getSystemSetting,
  setSystemSetting,
  DEFAULT_SYSTEM_SETTINGS
} from '@/lib/db/system-settings'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // Publicly allow fetching a single setting by key
    const key = searchParams.get('key')
    if (key) {
      const value = await getSystemSetting(key)
      return NextResponse.json({ key, value })
    }
    // For fetching all settings, require adminUserId and admin permission
    const adminUserId = searchParams.get('adminUserId')
    if (!adminUserId) {
      return NextResponse.json(
        { error: 'adminUserId is required' },
        { status: 400 }
      )
    }

    // 检查管理员权限
    const hasPermission = await checkUserPermission(adminUserId, 'admin_panel')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
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

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { adminUserId, key, value, type } = data

    if (!adminUserId || !key || value === undefined) {
      return NextResponse.json(
        { error: 'adminUserId, key, and value are required' },
        { status: 400 }
      )
    }

    // 检查管理员权限
    const hasPermission = await checkUserPermission(adminUserId, 'admin_panel')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
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

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json()
    const { adminUserId, settings } = data

    if (!adminUserId || !settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'adminUserId and settings object are required' },
        { status: 400 }
      )
    }

    // 检查管理员权限
    const hasPermission = await checkUserPermission(adminUserId, 'admin_panel')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
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
