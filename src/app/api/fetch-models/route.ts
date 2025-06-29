import { NextRequest, NextResponse } from 'next/server';

interface FetchModelsRequest {
  apiKey: string;
  baseUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const { apiKey, baseUrl }: FetchModelsRequest = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
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
      console.error('Fetch Models API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch models', details: errorData },
        { status: response.status }
      );
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
    console.error('Fetch Models Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
