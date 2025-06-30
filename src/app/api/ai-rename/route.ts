import { NextRequest, NextResponse } from 'next/server';

interface AIRenameRequest {
  modelId: string;
  aiConfig: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { modelId, aiConfig }: AIRenameRequest = await request.json();

    if (!modelId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    if (!aiConfig.apiKey) {
      return NextResponse.json({ error: 'AI API Key is required' }, { status: 400 });
    }

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
    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
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
      console.error('AI Rename API Error:', errorData);
      return NextResponse.json(
        { error: 'AI rename request failed', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const renamedName = data.choices?.[0]?.message?.content?.trim() || modelId;

    return NextResponse.json({
      success: true,
      originalModelId: modelId,
      renamedName: renamedName
    });

  } catch (error) {
    console.error('AI Rename Error:', error);
    return NextResponse.json(
      { error: 'AI rename failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
