import { randomBytes } from 'crypto'

/**
 * 生成以 fimai 开头的随机码
 * @param length 随机部分的长度（默认16）
 * @returns 格式为 fimai_xxxxxxxxxxxxxxxx 的字符串
 */
export function generateCode(length: number = 16): string {
  const randomPart = randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase()
  
  return `fimai_${randomPart}`
}

/**
 * 验证码格式是否正确
 * @param code 要验证的码
 * @returns 是否为有效格式
 */
export function isValidCodeFormat(code: string): boolean {
  return /^fimai_[A-F0-9]{16}$/.test(code)
}

/**
 * 生成邀请码
 * @returns 新的邀请码
 */
export function generateInviteCode(): string {
  return generateCode(16)
}

/**
 * 生成访问码
 * @returns 新的访问码
 */
export function generateAccessCode(): string {
  return generateCode(16)
}

/**
 * 硬编码的管理员邀请码（仅一次使用）
 */
export const ADMIN_INVITE_CODE = 'fimai_ADMIN_MASTER_KEY'

/**
 * 验证是否为管理员邀请码
 * @param code 要验证的码
 * @returns 是否为管理员邀请码
 */
export function isAdminInviteCode(code: string): boolean {
  return code === ADMIN_INVITE_CODE
}
