import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkChatPermissions } from '@/lib/chat-permissions';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  userId: string;
  modelId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, userId, modelId }: ChatRequest = await request.json();

    if (!messages || !userId || !modelId) {
      return NextResponse.json({
        error: 'Missing required fields: messages, userId, modelId'
      }, { status: 400 });
    }

    // 检查用户聊天权限
    const permissions = await checkChatPermissions(userId, modelId);
    if (!permissions.canChat) {
      return NextResponse.json(
        { error: permissions.error || 'No permission to chat' },
        { status: 403 }
      );
    }

    // 根据模型ID获取提供商配置
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
            apiKey: true,
            isEnabled: true,
          },
        },
      },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    if (!model.isEnabled || !model.provider.isEnabled) {
      return NextResponse.json({ error: 'Model or provider is disabled' }, { status: 400 });
    }

    if (!model.provider.apiKey || !model.provider.baseUrl) {
      return NextResponse.json({
        error: 'Provider configuration incomplete'
      }, { status: 500 });
    }

    // 构建请求URL
    const apiUrl = `${model.provider.baseUrl}/chat/completions`;

    // 调用AI API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.provider.apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: messages,
        stream: true,
        temperature: model.temperature || 0.7,
        max_tokens: model.maxTokens || 2000,
        ...(model.topP && { top_p: model.topP }),
        ...(model.frequencyPenalty && { frequency_penalty: model.frequencyPenalty }),
        ...(model.presencePenalty && { presence_penalty: model.presencePenalty }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('AI API Error:', errorData);
      return NextResponse.json(
        { error: 'AI API request failed', details: errorData },
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
