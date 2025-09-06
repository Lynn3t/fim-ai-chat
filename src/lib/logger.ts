/**
 * 安全的日志记录工具
 * 避免在生产环境中暴露敏感信息
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogOptions {
  level?: LogLevel
  context?: string
  sensitive?: boolean
  data?: any
}

// 敏感信息模式
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /authorization/i,
  /bearer/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /session/i,
  /cookie/i,
  /credit[_-]?card/i,
  /ssn/i,
  /social[_-]?security/i,
  /personal[_-]?identification/i,
]

// 敏感字段名
const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'key',
  'apiKey',
  'apiSecret',
  'accessToken',
  'refreshToken',
  'sessionToken',
  'authorization',
  'cookie',
  'creditCard',
  'ssn',
  'socialSecurity',
  'personalId',
]

/**
 * 检查字符串是否包含敏感信息
 */
function containsSensitiveInfo(str: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(str))
}

/**
 * 过滤敏感信息
 */
function filterSensitiveData(data: any, path: string = ''): any {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === 'string') {
    if (containsSensitiveInfo(data)) {
      return '[REDACTED]'
    }
    return data
  }

  if (Array.isArray(data)) {
    return data.map((item, index) => filterSensitiveData(item, `${path}[${index}]`))
  }

  if (typeof data === 'object') {
    const filtered: any = {}
    for (const [key, value] of Object.entries(data)) {
      const currentPath = path ? `${path}.${key}` : key
      
      if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
        filtered[key] = '[REDACTED]'
      } else {
        filtered[key] = filterSensitiveData(value, currentPath)
      }
    }
    return filtered
  }

  return data
}

/**
 * 格式化日志消息
 */
function formatLogMessage(message: string, options: LogOptions): string {
  const timestamp = new Date().toISOString()
  const context = options.context ? `[${options.context}]` : ''
  const level = options.level?.toUpperCase() || 'INFO'
  
  return `${timestamp} ${level} ${context} ${message}`
}

/**
 * 判断是否应该记录日志
 */
function shouldLog(level: LogLevel): boolean {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isTest = process.env.NODE_ENV === 'test'
  
  if (isTest) {
    return false
  }
  
  switch (level) {
    case 'debug':
      return isDevelopment
    case 'info':
      return isDevelopment || process.env.LOG_LEVEL === 'info'
    case 'warn':
      return isDevelopment || process.env.LOG_LEVEL === 'warn' || process.env.LOG_LEVEL === 'info'
    case 'error':
      return true // 总是记录错误
    default:
      return true
  }
}

/**
 * 安全的日志记录函数
 */
function safeLog(message: string, options: LogOptions = {}) {
  const level = options.level || 'info'
  
  if (!shouldLog(level)) {
    return
  }

  // 过滤敏感信息
  const safeMessage = filterSensitiveData(message)
  const safeData = options.data ? filterSensitiveData(options.data) : undefined
  
  const formattedMessage = formatLogMessage(safeMessage, options)
  
  // 根据级别选择输出方式
  switch (level) {
    case 'debug':
      if (safeData !== undefined) {
        console.debug(formattedMessage, safeData)
      } else {
        console.debug(formattedMessage)
      }
      break
    case 'info':
      if (safeData !== undefined) {
        console.info(formattedMessage, safeData)
      } else {
        console.info(formattedMessage)
      }
      break
    case 'warn':
      if (safeData !== undefined) {
        console.warn(formattedMessage, safeData)
      } else {
        console.warn(formattedMessage)
      }
      break
    case 'error':
      if (safeData !== undefined) {
        console.error(formattedMessage, safeData)
      } else {
        console.error(formattedMessage)
      }
      break
  }
}

/**
 * 调试日志
 */
export function debug(message: string, data?: any, context?: string) {
  safeLog(message, { level: 'debug', context, data })
}

/**
 * 信息日志
 */
export function info(message: string, data?: any, context?: string) {
  safeLog(message, { level: 'info', context, data })
}

/**
 * 警告日志
 */
export function warn(message: string, data?: any, context?: string) {
  safeLog(message, { level: 'warn', context, data })
}

/**
 * 错误日志
 */
export function error(message: string, data?: any, context?: string) {
  safeLog(message, { level: 'error', context, data })
}

/**
 * API请求日志
 */
export function apiRequest(method: string, url: string, userId?: string) {
  const message = `API ${method} ${url}`
  const data = userId ? { userId } : undefined
  info(message, data, 'API')
}

/**
 * API响应日志
 */
export function apiResponse(method: string, url: string, status: number, duration?: number) {
  const message = `API ${method} ${url} - ${status}`
  const data = duration ? { duration: `${duration}ms` } : undefined
  info(message, data, 'API')
}

/**
 * 数据库操作日志
 */
export function dbOperation(operation: string, table: string, duration?: number) {
  const message = `DB ${operation} on ${table}`
  const data = duration ? { duration: `${duration}ms` } : undefined
  info(message, data, 'DB')
}

/**
 * 认证日志
 */
export function authEvent(event: string, userId?: string, details?: any) {
  const message = `Auth ${event}`
  const data = { userId, ...filterSensitiveData(details) }
  info(message, data, 'AUTH')
}

/**
 * 安全事件日志
 */
export function securityEvent(event: string, details?: any) {
  const message = `Security ${event}`
  const data = filterSensitiveData(details)
  warn(message, data, 'SECURITY')
}

/**
 * 性能日志
 */
export function performanceMetric(operation: string, duration: number, details?: any) {
  const message = `Performance ${operation}`
  const data = { duration: `${duration}ms`, ...filterSensitiveData(details) }
  debug(message, data, 'PERFORMANCE')
}

/**
 * 业务逻辑日志
 */
export function businessEvent(event: string, details?: any) {
  const message = `Business ${event}`
  const data = filterSensitiveData(details)
  info(message, data, 'BUSINESS')
}

export default {
  debug,
  info,
  warn,
  error,
  apiRequest,
  apiResponse,
  dbOperation,
  authEvent,
  securityEvent,
  performanceMetric,
  businessEvent,
}