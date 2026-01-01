import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, AppError } from '@/lib/error-handler';
import { safeDecrypt } from '@/lib/encryption';

interface AIRenameRequest {
  modelId: string;
  aiModelId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { modelId, aiModelId }: AIRenameRequest = await request.json();

    if (!modelId) {
      throw AppError.badRequest('Model ID is required');
    }

    if (!aiModelId) {
      throw AppError.badRequest('AI Model ID is required');
    }

    // 从数据库获取 AI 模型及其提供商信息
    const aiModel = await prisma.model.findUnique({
      where: { id: aiModelId },
      include: {
        provider: true,
      },
    });

    if (!aiModel || !aiModel.provider) {
      throw AppError.notFound('AI 模型不存在');
    }

    const provider = aiModel.provider;

    if (!provider.baseUrl) {
      throw AppError.badRequest('提供商未配置 Base URL');
    }

    if (!provider.apiKey) {
      throw AppError.badRequest('提供商未配置 API Key');
    }

    // 解密 apiKey
    const apiKey = safeDecrypt(provider.apiKey);

    const prompt = `输入模型 ID，输出格式化的模型名称。

规则：
1. 将字母与数字分开，并将首字母大写。
2. 如果模型 ID 包含日期（格式为 YYYY-MM-DD），则将其转为连续数字格式（YYYYMMDD），并放在方括号中。
3. 如果模型 ID 包含附加信息（如组织名），则将其放在方括号中。

输入示例：
- gpt-4o-mini
- deepseek-ai/DeepSeek-V3
- gpt-4.1-mini-2025-04-14

输出示例：
- GPT-4o Mini
- DeepSeek V3 [deepseek-ai]
- GPT-4.1 Mini [20250414]

请提供模型 ID：${modelId}

请直接输出格式化后的模型名称，不要包含其他解释文字。`;

    // 调用AI API
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: aiModel.modelId,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw AppError.externalApi(`AI 重命名请求失败: ${errorData}`);
    }

    const data = await response.json();
    const renamedName = data.choices?.[0]?.message?.content?.trim() || modelId;

    return NextResponse.json({
      success: true,
      originalModelId: modelId,
      renamedName: renamedName
    });

  } catch (error) {
    return handleApiError(error, 'POST /api/ai-rename');
  }
}
