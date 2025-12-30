import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, AppError } from '@/lib/error-handler';

interface FetchModelsRequest {
  apiKey: string;
  baseUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const { apiKey, baseUrl }: FetchModelsRequest = await request.json();

    if (!apiKey) {
      throw AppError.badRequest('API Key is required');
    }

    // 构建请求URL
    const apiUrl = `${baseUrl}/models`;

    // 获取模型列表
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw AppError.externalApi(`Failed to fetch models: ${errorData}`);
    }

    const data = await response.json();

    // 提取模型ID列表
    const models = data.data?.map((model: { id: string }) => model.id) || [];

    return NextResponse.json({
      success: true,
      models: models,
      total: models.length
    });

  } catch (error) {
    return handleApiError(error, 'POST /api/fetch-models');
  }
}
