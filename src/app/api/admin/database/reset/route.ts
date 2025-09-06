import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/api-utils'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import crypto from 'crypto'
import { validateSchema, databaseResetSchema } from '@/lib/validation'
import { logger } from '@/lib/logger'

const execAsync = promisify(exec)

// 生成一次性重置令牌
const generateResetToken = () => crypto.randomBytes(32).toString('hex')
const resetTokens = new Map<string, { timestamp: number; used: boolean }>()

// 清理过期的令牌（5分钟有效期）
const cleanupExpiredTokens = () => {
  const now = Date.now()
  const expireTime = 5 * 60 * 1000 // 5分钟
  
  for (const [token, data] of resetTokens.entries()) {
    if (now - data.timestamp > expireTime) {
      resetTokens.delete(token)
    }
  }
}

async function handlePost(request: NextRequest, userId: string) {
  try {
    const data = await request.json()
    
    // 验证输入数据
    const validatedData = validateSchema(databaseResetSchema, data)
    const { confirmText, resetToken } = validatedData

    // 清理过期令牌
    cleanupExpiredTokens()

    // 验证重置令牌
    if (!resetToken || !resetTokens.has(resetToken)) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new one.' },
        { status: 400 }
      )
    }

    const tokenData = resetTokens.get(resetToken)!
    if (tokenData.used) {
      return NextResponse.json(
        { error: 'Reset token has already been used. Please request a new one.' },
        { status: 400 }
      )
    }

    // 标记令牌为已使用
    tokenData.used = true

    // 获取项目根目录
    const projectRoot = process.cwd()
    
    try {
      logger.info('Starting database reset', { userId }, 'DB_RESET')
      
      // 执行数据库重置命令
      const { stdout: resetOutput, stderr: resetError } = await execAsync('npm run db:reset', {
        cwd: projectRoot,
        timeout: 60000, // 60秒超时
      })
      
      if (resetError) {
        logger.warn('Database reset stderr', { error: resetError }, 'DB_RESET')
      }
      
      logger.debug('Database reset output', { output: resetOutput }, 'DB_RESET')
      
      // 执行数据库种子
      const { stdout: seedOutput, stderr: seedError } = await execAsync('npm run db:seed', {
        cwd: projectRoot,
        timeout: 60000, // 60秒超时
      })
      
      if (seedError) {
        logger.warn('Database seed stderr', { error: seedError }, 'DB_RESET')
      }
      
      logger.debug('Database seed output', { output: seedOutput }, 'DB_RESET')

      // 清理已使用的令牌
      resetTokens.delete(resetToken)

      logger.info('Database reset and seed completed successfully', { userId }, 'DB_RESET')

      return NextResponse.json({
        success: true,
        message: 'Database has been successfully reset and reseeded',
        details: {
          resetOutput: resetOutput.trim(),
          seedOutput: seedOutput.trim(),
        }
      })

    } catch (execError: any) {
      logger.error('Database reset execution error', execError, 'DB_RESET')
      
      return NextResponse.json(
        { 
          error: 'Failed to reset database',
          details: process.env.NODE_ENV === 'development' ? execError.message : undefined,
        },
        { status: 500 }
      )
    }

  } catch (error) {
    logger.error('Database reset error', error, 'DB_RESET')
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to reset database' },
      { status: 500 }
    )
  }
}

async function handleGet(request: NextRequest, userId: string) {
  try {
    // 生成新的重置令牌
    const resetToken = generateResetToken()
    resetTokens.set(resetToken, { timestamp: Date.now(), used: false })

    // 返回数据库重置信息
    return NextResponse.json({
      available: true,
      warning: 'This action will permanently delete all data and cannot be undone.',
      confirmationRequired: 'RESET DATABASE',
      resetToken,
      tokenExpiry: '5 minutes',
      steps: [
        'All user accounts will be deleted',
        'All chat conversations will be deleted', 
        'All invite codes and access codes will be deleted',
        'All token usage statistics will be deleted',
        'Database will be recreated with default schema',
        'Default providers and models will be reseeded',
        'You will need to register a new admin account'
      ]
    })

  } catch (error) {
    logger.error('Error getting database reset info', error, 'DB_RESET')
    return NextResponse.json(
      { error: 'Failed to get database reset information' },
      { status: 500 }
    )
  }
}

export const POST = withAdminAuth(handlePost)
export const GET = withAdminAuth(handleGet)
