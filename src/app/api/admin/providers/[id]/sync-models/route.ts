import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { handleApiError, AppError } from '@/lib/error-handler'
import { safeDecrypt } from '@/lib/encryption'

async function syncModelsHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params

    // 获取提供商信息（包含 apiKey）
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
    })

    if (!provider) {
      throw AppError.notFound('提供商不存在')
    }

    if (!provider.baseUrl) {
      throw AppError.badRequest('提供商未配置 Base URL')
    }

    if (!provider.apiKey) {
      throw AppError.badRequest('提供商未配置 API Key')
    }

    // 解密 apiKey（如果已加密）
    const apiKey = safeDecrypt(provider.apiKey)

    // 调用外部 API 获取模型列表
    const apiUrl = `${provider.baseUrl}/models`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw AppError.externalApi(`获取模型列表失败: ${errorText}`)
      }

      const data = await response.json()
      const modelIds = data.data?.map((model: { id: string }) => model.id) || []

      if (modelIds.length === 0) {
        return NextResponse.json({
          success: false,
          error: '未获取到任何模型',
          models: [],
        })
      }

      // 获取现有模型
      const existingModels = await prisma.model.findMany({
        where: { providerId },
        select: { modelId: true },
      })
      const existingModelIds = new Set(existingModels.map(m => m.modelId))

      // 过滤出新模型
      const newModelIds = modelIds.filter((id: string) => !existingModelIds.has(id))

      if (newModelIds.length > 0) {
        // 获取当前最大排序值
        const maxOrderModel = await prisma.model.findFirst({
          where: { providerId },
          orderBy: { order: 'desc' },
          select: { order: true },
        })
        let currentOrder = maxOrderModel?.order || 0

        // 批量创建新模型
        await prisma.model.createMany({
          data: newModelIds.map((modelId: string) => ({
            modelId,
            name: modelId,
            providerId,
            isEnabled: true,
            order: ++currentOrder,
          })),
        })
      }

      return NextResponse.json({
        success: true,
        total: modelIds.length,
        new: newModelIds.length,
        existing: existingModelIds.size,
        message: `成功同步 ${modelIds.length} 个模型，其中 ${newModelIds.length} 个为新模型`,
      })

    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw AppError.timeout('请求超时，请稍后重试')
      }
      throw fetchError
    }

  } catch (error) {
    return handleApiError(error, 'POST /api/admin/providers/[id]/sync-models')
  }
}

export const POST = withAdminAuth(syncModelsHandler)
