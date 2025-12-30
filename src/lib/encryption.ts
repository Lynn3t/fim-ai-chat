/**
 * 加密模块
 * 用于加密存储敏感数据（如 API 密钥）
 */

import crypto from 'crypto';
import logger from './logger';

/**
 * 加密算法配置
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * 获取加密密钥
 * @returns Buffer 格式的密钥
 * @throws 如果密钥未配置或格式错误
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY 环境变量未配置。请在 .env 文件中设置 ENCRYPTION_KEY。');
  }

  // 尝试作为 base64 解码
  try {
    const decoded = Buffer.from(key, 'base64');
    if (decoded.length >= KEY_LENGTH) {
      return decoded.slice(0, KEY_LENGTH);
    }
  } catch {
    // 不是有效的 base64，继续尝试其他方式
  }

  // 如果是普通字符串，使用 SHA-256 哈希生成密钥
  if (key.length >= 32) {
    return crypto.createHash('sha256').update(key).digest();
  }

  throw new Error('ENCRYPTION_KEY 长度不足，至少需要 32 个字符。');
}

/**
 * 检查加密功能是否可用
 */
export function isEncryptionAvailable(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * 加密文本
 * @param plaintext 明文
 * @returns 加密后的字符串（格式: iv:authTag:encrypted）
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('加密内容不能为空');
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 返回格式: iv:authTag:encrypted (都是 hex 编码)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error('Encryption failed', error, 'ENCRYPTION');
    throw new Error('加密失败');
  }
}

/**
 * 解密文本
 * @param encryptedData 加密的字符串（格式: iv:authTag:encrypted）
 * @returns 解密后的明文
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('解密内容不能为空');
  }

  try {
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('加密数据格式无效');
    }

    const [ivHex, authTagHex, encrypted] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    if (iv.length !== IV_LENGTH) {
      throw new Error('IV 长度无效');
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('AuthTag 长度无效');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unsupported state or unable to authenticate data')) {
      logger.error('Decryption failed: authentication failed', null, 'ENCRYPTION');
      throw new Error('解密失败：数据已被篡改或密钥错误');
    }

    logger.error('Decryption failed', error, 'ENCRYPTION');
    throw new Error('解密失败');
  }
}

/**
 * 安全加密（如果加密不可用则返回原文）
 * @param plaintext 明文
 * @returns 加密后的字符串或原文
 */
export function safeEncrypt(plaintext: string): string {
  if (!isEncryptionAvailable()) {
    logger.warn('Encryption not available, storing plaintext', null, 'ENCRYPTION');
    return plaintext;
  }

  return encrypt(plaintext);
}

/**
 * 安全解密（自动检测是否已加密）
 * @param data 可能是加密的数据或明文
 * @returns 解密后的明文
 */
export function safeDecrypt(data: string): string {
  if (!data) {
    return data;
  }

  // 检查是否是加密格式 (iv:authTag:encrypted)
  const parts = data.split(':');
  if (parts.length !== 3) {
    // 不是加密格式，返回原文
    return data;
  }

  // 检查各部分是否是有效的 hex
  const [ivHex, authTagHex] = parts;
  if (ivHex.length !== IV_LENGTH * 2 || authTagHex.length !== AUTH_TAG_LENGTH * 2) {
    // 不是有效的加密格式，返回原文
    return data;
  }

  try {
    return decrypt(data);
  } catch {
    // 解密失败，可能是未加密的数据
    return data;
  }
}

/**
 * 加密 API 密钥用于数据库存储
 * @param apiKey API 密钥明文
 * @returns 加密后的字符串
 */
export function encryptApiKey(apiKey: string): string {
  return safeEncrypt(apiKey);
}

/**
 * 解密 API 密钥
 * @param encryptedApiKey 加密的 API 密钥
 * @returns 解密后的 API 密钥
 */
export function decryptApiKey(encryptedApiKey: string): string {
  return safeDecrypt(encryptedApiKey);
}

/**
 * 生成随机加密密钥
 * @returns base64 编码的随机密钥
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * 哈希敏感数据（不可逆）
 * @param data 要哈希的数据
 * @returns SHA-256 哈希值
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * 比较哈希值（常量时间比较，防止时序攻击）
 * @param data 原始数据
 * @param hashedData 哈希后的数据
 * @returns 是否匹配
 */
export function compareHash(data: string, hashedData: string): boolean {
  const dataHash = hash(data);
  return crypto.timingSafeEqual(Buffer.from(dataHash), Buffer.from(hashedData));
}

/**
 * 遮蔽敏感字符串（用于日志）
 * @param str 原始字符串
 * @param visibleChars 保留可见的字符数
 * @returns 遮蔽后的字符串
 */
export function maskString(str: string, visibleChars: number = 4): string {
  if (!str || str.length <= visibleChars) {
    return '****';
  }

  const visible = str.slice(0, visibleChars);
  const masked = '*'.repeat(Math.min(str.length - visibleChars, 20));

  return `${visible}${masked}`;
}

export default {
  encrypt,
  decrypt,
  safeEncrypt,
  safeDecrypt,
  encryptApiKey,
  decryptApiKey,
  generateEncryptionKey,
  hash,
  compareHash,
  maskString,
  isEncryptionAvailable,
};
