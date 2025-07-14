import { prisma } from '@/lib/prisma'
import type { SystemSettings } from '@prisma/client'

export interface SystemSettingValue {
  key: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'json'
  description?: string
}

// 默认系统设置
export const DEFAULT_SYSTEM_SETTINGS: SystemSettingValue[] = [
  {
    key: 'user_max_invite_codes',
    value: 1,
    type: 'number',
    description: '用户最大邀请码创建数量'
  },
  {
    key: 'user_max_access_codes',
    value: 10,
    type: 'number',
    description: '用户最大访问码创建数量'
  },
  {
    key: 'access_code_max_users',
    value: 10,
    type: 'number',
    description: '单个访问码最大用户数量'
  },
  {
    key: 'invite_code_max_uses',
    value: 1,
    type: 'number',
    description: '单个邀请码最大使用次数'
  },
  {
    key: 'enable_guest_registration',
    value: true,
    type: 'boolean',
    description: '是否允许访客注册'
  },
  {
    key: 'default_user_token_limit',
    value: 100000,
    type: 'number',
    description: '默认用户Token限制'
  },
  {
    key: 'default_limit_type',
    value: 'token',
    type: 'string',
    description: '默认限制类型：none, token, cost'
  },
  {
    key: 'enable_token_tracking',
    value: true,
    type: 'boolean',
    description: '是否启用Token使用统计'
  },
  {
    key: 'title_generation_model_id',
    value: null,
    type: 'string',
    description: '用于生成对话标题的模型ID'
  },
  {
    key: 'system_default_model_id',
    value: null,
    type: 'string',
    description: '系统默认模型ID（新用户首次访问使用）'
  },
  {
    key: 'enable_last_used_model',
    value: true,
    type: 'boolean',
    description: '是否自动将上次使用的模型设为默认模型'
  }
]

/**
 * 获取系统设置值
 */
export async function getSystemSetting(key: string): Promise<any> {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key }
    })

    if (!setting) {
      // 返回默认值
      const defaultSetting = DEFAULT_SYSTEM_SETTINGS.find(s => s.key === key)
      return defaultSetting?.value
    }

    // 根据类型解析值
    switch (setting.type) {
      case 'number':
        return parseInt(setting.value)
      case 'boolean':
        return setting.value === 'true'
      case 'json':
        return JSON.parse(setting.value)
      default:
        return setting.value
    }
  } catch (error) {
    console.error('Error getting system setting:', error)
    // 返回默认值
    const defaultSetting = DEFAULT_SYSTEM_SETTINGS.find(s => s.key === key)
    return defaultSetting?.value
  }
}

/**
 * 设置系统设置值
 */
export async function setSystemSetting(key: string, value: any, type?: string): Promise<SystemSettings> {
  // 确定值类型
  const valueType = type || (typeof value === 'object' ? 'json' : typeof value)
  
  // 转换值为字符串
  let stringValue: string
  if (valueType === 'json') {
    stringValue = JSON.stringify(value)
  } else {
    stringValue = String(value)
  }

  return prisma.systemSettings.upsert({
    where: { key },
    update: {
      value: stringValue,
      type: valueType,
      updatedAt: new Date()
    },
    create: {
      key,
      value: stringValue,
      type: valueType,
      description: DEFAULT_SYSTEM_SETTINGS.find(s => s.key === key)?.description
    }
  })
}

/**
 * 获取所有系统设置
 */
export async function getAllSystemSettings(): Promise<Record<string, any>> {
  try {
    const settings = await prisma.systemSettings.findMany()
    const result: Record<string, any> = {}

    // 添加数据库中的设置
    for (const setting of settings) {
      switch (setting.type) {
        case 'number':
          result[setting.key] = parseInt(setting.value)
          break
        case 'boolean':
          result[setting.key] = setting.value === 'true'
          break
        case 'json':
          result[setting.key] = JSON.parse(setting.value)
          break
        default:
          result[setting.key] = setting.value
      }
    }

    // 添加缺失的默认设置
    for (const defaultSetting of DEFAULT_SYSTEM_SETTINGS) {
      if (!(defaultSetting.key in result)) {
        result[defaultSetting.key] = defaultSetting.value
      }
    }

    return result
  } catch (error) {
    console.error('Error getting all system settings:', error)
    // 返回默认设置
    const result: Record<string, any> = {}
    for (const defaultSetting of DEFAULT_SYSTEM_SETTINGS) {
      result[defaultSetting.key] = defaultSetting.value
    }
    return result
  }
}

/**
 * 初始化系统设置（如果不存在）
 */
export async function initializeSystemSettings(): Promise<void> {
  try {
    for (const defaultSetting of DEFAULT_SYSTEM_SETTINGS) {
      const existing = await prisma.systemSettings.findUnique({
        where: { key: defaultSetting.key }
      })

      if (!existing) {
        await setSystemSetting(
          defaultSetting.key,
          defaultSetting.value,
          defaultSetting.type
        )
      }
    }
  } catch (error) {
    console.error('Error initializing system settings:', error)
  }
}

/**
 * 批量更新系统设置
 */
export async function updateSystemSettings(settings: Record<string, any>): Promise<void> {
  try {
    for (const [key, value] of Object.entries(settings)) {
      await setSystemSetting(key, value)
    }
  } catch (error) {
    console.error('Error updating system settings:', error)
    throw error
  }
}
