/**
 * 环境变量验证
 * 在应用启动时验证必需的环境变量
 */

import { z } from 'zod';

/**
 * 环境变量 Schema
 */
const envSchema = z.object({
  // ================================
  // 数据库配置（必需）
  // ================================
  DATABASE_URL: z.string().min(1, 'DATABASE_URL 是必需的'),

  // ================================
  // JWT 认证配置（必需）
  // ================================
  JWT_SECRET: z.string().min(32, 'JWT_SECRET 至少需要 32 个字符'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // ================================
  // 加密密钥（可选，用于加密敏感数据）
  // ================================
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY 至少需要 32 个字符').optional(),

  // ================================
  // 应用配置
  // ================================
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(3000),

  // ================================
  // 邮件配置（可选）
  // ================================
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // ================================
  // 限流配置（可选）
  // ================================
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // ================================
  // 日志配置（可选）
  // ================================
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE: z.string().optional(),
});

/**
 * 环境变量类型
 */
export type Env = z.infer<typeof envSchema>;

/**
 * 验证结果缓存
 */
let cachedEnv: Env | null = null;

/**
 * 验证环境变量
 * @returns 验证后的环境变量对象
 * @throws 如果验证失败
 */
function validateEnv(): Env {
  // 返回缓存的结果
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ 环境变量配置错误:');
    result.error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    console.error('\n请检查 .env 文件配置，参考 .env.example');

    // 在生产环境中退出进程
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }

    // 开发环境抛出错误
    throw new Error('环境变量验证失败');
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/**
 * 获取验证后的环境变量
 * 使用延迟验证，只在首次访问时验证
 */
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    const validated = validateEnv();
    return validated[prop as keyof Env];
  },
});

/**
 * 检查是否为开发环境
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 检查是否为生产环境
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * 检查是否为测试环境
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * 获取当前环境名称
 */
export function getEnvironment(): 'development' | 'production' | 'test' {
  return (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
}

/**
 * 检查邮件配置是否完整
 */
export function isEmailConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );
}

/**
 * 检查加密密钥是否配置
 */
export function isEncryptionConfigured(): boolean {
  const key = process.env.ENCRYPTION_KEY;
  return !!(key && key.length >= 32);
}

/**
 * 获取安全的环境变量值（用于日志）
 * 敏感值会被遮蔽
 */
export function getSafeEnvForLogging(): Record<string, string> {
  const sensitiveKeys = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'SMTP_PASSWORD',
    'DATABASE_URL',
  ];

  const result: Record<string, string> = {};

  Object.keys(process.env).forEach(key => {
    if (sensitiveKeys.some(sk => key.includes(sk))) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = process.env[key] || '';
    }
  });

  return result;
}

/**
 * 在应用启动时调用，验证所有必需的环境变量
 */
export function validateEnvironmentOnStartup(): void {
  try {
    validateEnv();
    console.log('✅ 环境变量验证通过');
  } catch (error) {
    // 错误已经在 validateEnv 中打印
    if (isProduction()) {
      process.exit(1);
    }
  }
}

export default {
  env,
  isDevelopment,
  isProduction,
  isTest,
  getEnvironment,
  isEmailConfigured,
  isEncryptionConfigured,
  validateEnvironmentOnStartup,
};
