import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import {
  getAllSystemSettings,
  updateSystemSettings,
  getSystemSetting,
  setSystemSetting,
  DEFAULT_SYSTEM_SETTINGS
} from '@/lib/db/system-settings'
import { handleApiError, AppError } from '@/lib/error-handler'

async function handleGet(request: NextRequest, user: AuthUser) {
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
    return handleApiError(error, 'GET /api/admin/system-settings')
  }
}

async function handlePost(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()
    const { key, value, type } = data

    if (!key || value === undefined) {
      throw AppError.badRequest('缺少 key 或 value 参数')
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
    return handleApiError(error, 'POST /api/admin/system-settings')
  }
}

async function handlePatch(request: NextRequest, user: AuthUser) {
  try {
    const data = await request.json()
    const { settings } = data

    if (!settings || typeof settings !== 'object') {
      throw AppError.badRequest('缺少 settings 对象')
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
    return handleApiError(error, 'PATCH /api/admin/system-settings')
  }
}

export const GET = withAdminAuth(handleGet)
export const POST = withAdminAuth(handlePost)
export const PATCH = withAdminAuth(handlePatch)
