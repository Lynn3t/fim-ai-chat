import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, AppError } from '@/lib/error-handler';

interface ConfigData {
  openaiApiKey: string;
  openaiBaseUrl: string;
  model: string;
}

export async function POST(request: NextRequest) {
  try {
    const config: ConfigData = await request.json();

    if (!config.openaiApiKey) {
      throw AppError.badRequest('API Key is required');
    }

    // 构建请求URL
    const apiUrl = `${config.openaiBaseUrl}/models`;

    // 测试API连接
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.openaiApiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw AppError.externalApi(`API connection test failed: ${errorData}`);
    }

    const data = await response.json();

    // 检查指定的模型是否可用
    const availableModels = data.data?.map((model: { id: string }) => model.id) || [];
    const modelAvailable = availableModels.includes(config.model);

    return NextResponse.json({
      success: true,
      message: 'API connection successful',
      modelAvailable,
      availableModels: availableModels.slice(0, 10), // 只返回前10个模型
    });

  } catch (error) {
    return handleApiError(error, 'POST /api/test-connection');
  }
}
