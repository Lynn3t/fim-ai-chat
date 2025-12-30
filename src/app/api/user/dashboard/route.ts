import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { getUserTokenStats } from '@/lib/db/token-usage';
import { getUserAccessCodes, getUserInviteCodes } from '@/lib/db/codes';
import { getUserSettings } from '@/lib/db/users';
import { handleApiError, AppError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getCurrentUser(request);

    if (!authUser) {
      throw AppError.unauthorized('请先登录');
    }

    // 获取用户的 Token 使用情况
    const tokenStats = await getUserTokenStats(authUser.userId);

    // 获取用户创建的访问码
    const accessCodes = await getUserAccessCodes(authUser.userId);

    // 获取用户创建的邀请码
    const inviteCodes = await getUserInviteCodes(authUser.userId);

    // 获取用户可用的模型
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      include: {
        permissions: true
      }
    });

    // 获取用户的设置信息
    const userSettings = await getUserSettings(authUser.userId);

    let allowedModelIds: string[] = [];

    // 如果用户是管理员，可以使用所有模型
    if (user?.role === 'ADMIN') {
      const allModels = await prisma.model.findMany({
        where: { isEnabled: true },
        select: { id: true }
      });
      allowedModelIds = allModels.map(model => model.id);
    }
    // 普通用户使用权限设置中的模型
    else if (user?.permissions?.allowedModelIds) {
      allowedModelIds = user.permissions.allowedModelIds.split(',');
    }
    // 访客使用访问码指定的模型
    else if (user?.role === 'GUEST' && user?.usedAccessCode) {
      const accessCode = await prisma.accessCode.findUnique({
        where: { code: user.usedAccessCode }
      });

      if (accessCode?.allowedModelIds) {
        allowedModelIds = accessCode.allowedModelIds.split(',');
      }
    }
    // 没有特定权限，使用所有启用的模型
    else {
      const allModels = await prisma.model.findMany({
        where: { isEnabled: true },
        select: { id: true }
      });
      allowedModelIds = allModels.map(model => model.id);
    }

    // 获取详细的模型信息
    const allowedModels = await prisma.model.findMany({
      where: {
        id: { in: allowedModelIds },
        isEnabled: true
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      tokenStats,
      accessCodes,
      inviteCodes,
      allowedModels,
      userSettings
    });

  } catch (error) {
    return handleApiError(error, 'GET /api/user/dashboard');
  }
}
