import { NextRequest, NextResponse } from 'next/server';

interface ConfigData {
  openaiApiKey: string;
  openaiBaseUrl: string;
  model: string;
}

export async function POST(request: NextRequest) {
  try {
    const config: ConfigData = await request.json();

    if (!config.openaiApiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
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
      console.error('OpenAI API Test Error:', errorData);
      return NextResponse.json(
        { error: 'API connection test failed', details: errorData },
        { status: response.status }
      );
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
    console.error('Test Connection Error:', error);
    return NextResponse.json(
      { error: 'Connection test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
