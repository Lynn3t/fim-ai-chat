import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkUserPermission } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// 管理员重置用户密码
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json()
    const { adminUserId, newPassword } = data
    const { id: userId } = await params

    if (!adminUserId) {
      return NextResponse.json(
        { error: 'adminUserId is required' },
        { status: 400 }
      )
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少需要6个字符' },
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

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 对新密码进行哈希处理
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 更新用户密码
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `密码已成功重置` 
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: '密码重置失败' },
      { status: 500 }
    )
  }
} 