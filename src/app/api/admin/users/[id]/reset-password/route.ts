import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api-utils'
import bcrypt from 'bcryptjs'

// 管理员重置用户密码
async function resetPasswordHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) {
  const data = await request.json()
  const { newPassword } = data
  const { id: targetUserId } = await params

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: '密码长度至少需要6个字符' },
      { status: 400 }
    )
  }

  // 检查用户是否存在
  const user = await prisma.user.findUnique({
    where: { id: targetUserId }
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
    where: { id: targetUserId },
    data: {
      password: hashedPassword
    }
  })

  return NextResponse.json({ 
    success: true, 
    message: `密码已成功重置` 
  })
}

export const POST = withAdminAuth(resetPasswordHandler) 