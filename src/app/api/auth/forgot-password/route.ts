import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const schema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  verificationType: z.enum(['password', 'email']),
  password: z.string().optional(),
  email: z.string().email().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = schema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: '输入验证失败: ' + validation.error.message
      }, { status: 400 })
    }

    const { username, verificationType, password, email } = validation.data
    
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 })
    }

    // 根据验证类型进行验证
    let isVerified = false

    if (verificationType === 'password' && password) {
      // 验证原密码
      if (!user.password) {
        return NextResponse.json({
          success: false,
          error: '此账户没有设置密码，请使用邮箱验证'
        }, { status: 400 })
      }

      const passwordMatch = await bcrypt.compare(password, user.password)
      isVerified = passwordMatch
    } 
    else if (verificationType === 'email' && email) {
      // 验证邮箱
      if (!user.email) {
        return NextResponse.json({
          success: false,
          error: '此账户没有关联邮箱，请使用密码验证'
        }, { status: 400 })
      }

      isVerified = user.email.toLowerCase() === email.toLowerCase()
    }

    if (!isVerified) {
      return NextResponse.json({
        success: false,
        error: verificationType === 'password' ? '密码不正确' : '邮箱不匹配'
      }, { status: 400 })
    }

    // 生成重置令牌
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1小时有效期

    // 保存重置令牌到数据库
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    })

    return NextResponse.json({
      success: true,
      resetToken,
      message: '验证成功，请设置新密码'
    })
    
  } catch (error) {
    console.error('密码重置验证错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误，请稍后重试'
    }, { status: 500 })
  }
} 