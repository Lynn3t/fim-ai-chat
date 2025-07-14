import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('请提供有效的邮箱地址'),
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

    const { email } = validation.data
    
    // 查找与邮箱关联的用户
    const user = await prisma.user.findFirst({
      where: { 
        email: {
          equals: email,
          mode: 'insensitive' // 不区分大小写
        }
      }
    })

    if (!user || !user.username) {
      return NextResponse.json({
        success: false,
        error: '未找到与该邮箱关联的用户'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      username: user.username,
      message: '已找到与该邮箱关联的用户名'
    })
    
  } catch (error) {
    console.error('查找用户名错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误，请稍后重试'
    }, { status: 500 })
  }
} 