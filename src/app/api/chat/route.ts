import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ConfigData {
  openaiApiKey: string;
  openaiBaseUrl: string;
  model: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, config }: { messages: Message[], config: ConfigData } = await request.json();

    if (!config.openaiApiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    // 构建请求URL
    const apiUrl = `${config.openaiBaseUrl}/chat/completions`;

    // 调用OpenAI API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', errorData);
      return NextResponse.json(
        { error: 'OpenAI API request failed', details: errorData },
        { status: response.status }
      );
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 解码数据
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  // 验证JSON格式
                  JSON.parse(data);
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch {
                  // 忽略无效的JSON数据
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
