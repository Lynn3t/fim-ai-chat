import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkChatPermissions } from '@/lib/chat-permissions';
import { estimateTokens, extractTokenUsage } from '@/lib/token-counter';
import { recordTokenUsage } from '@/lib/db/token-usage';
import { getUserFromRequest } from '@/lib/api-utils';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  modelId: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export async function POST(request: NextRequest) {
  try {
    // 从请求中获取用户ID
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const {
      messages,
      modelId,
      stream = true,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
    }: ChatRequest = await request.json();

    if (!messages || messages.length === 0 || !modelId) {
      return NextResponse.json({
        error: 'Missing or empty required fields: messages, modelId'
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

    if (!model || !model.provider) {
      return NextResponse.json(
        { error: 'Model or provider not found' },
        { status: 404 }
      );
    }

    if (!model.isEnabled || !model.provider.isEnabled) {
      return NextResponse.json(
        { error: 'Model or provider is disabled' },
        { status: 403 }
      );
    }

    if (!model.provider.apiKey || !model.provider.baseUrl) {
      return NextResponse.json({
        error: 'Provider configuration incomplete'
      }, { status: 500 });
    }

    // 在发送请求前计算输入的token数量（用于备份和比较）
    const userMessage = messages[messages.length - 1];
    const promptContent = messages.map(m => m.content).join('\n');
    const estimatedPromptTokens = estimateTokens(promptContent);

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
        messages,
        stream,
        temperature: temperature ?? model.temperature ?? 0.7,
        max_tokens: max_tokens ?? model.maxTokens ?? 2000,
        ...(top_p !== undefined ? { top_p } : model.topP ? { top_p: model.topP } : {}),
        ...(frequency_penalty !== undefined ? { frequency_penalty } : model.frequencyPenalty ? { frequency_penalty: model.frequencyPenalty } : {}),
        ...(presence_penalty !== undefined ? { presence_penalty } : model.presencePenalty ? { presence_penalty: model.presencePenalty } : {}),
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

    // If client requested no streaming, return full JSON
    if (!stream) {
      const json = await response.json();
      return NextResponse.json(json);
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let fullAssistantMessage = ''; // 用于记录完整的助手回复内容
        let tokenUsage: any = null; // 用于记录token使用情况
        let buffer = ''; // 用于处理被分割的JSON数据

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 解码数据
            const chunk = new TextDecoder().decode(value);
            buffer += chunk;
            
            // 处理每一行数据
            while (buffer.includes('\n')) {
              const lineEndIndex = buffer.indexOf('\n');
              const line = buffer.substring(0, lineEndIndex).trim();
              buffer = buffer.substring(lineEndIndex + 1);
              
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }
                
                try {
                  // 尝试解析JSON
                  const jsonData = JSON.parse(data);
                  
                  // 提取token使用信息（如果有）
                  if (jsonData.usage) {
                    tokenUsage = jsonData.usage;
                  }
                  
                  // 收集助手回复内容（用于后续token估算）
                  if (jsonData.choices && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                    fullAssistantMessage += jsonData.choices[0].delta.content;
                  }
                  
                  // 移除可能包含的敏感信息
                  delete jsonData.user;
                  delete jsonData.provider;
                  if (jsonData.model) {
                    // 保留基本模型信息，移除详细配置
                    jsonData.model = typeof jsonData.model === 'string' ? 
                      jsonData.model : 
                      { name: jsonData.model.name, id: jsonData.model.id };
                  }
                  
                  // 确保输出的是有效的JSON
                  const cleanJson = JSON.stringify(jsonData);
                  controller.enqueue(encoder.encode(`data: ${cleanJson}\n\n`));
                } catch (error) {
                  // 记录无效的JSON数据
                  console.error('无效的JSON数据:', data);
                  
                  // 尝试修复和处理不完整的JSON
                  // 不向客户端发送错误的数据，而是在日志中记录
                  if (data.length > 0) {
                    console.log('Skipping malformed JSON chunk');
                  }
                }
              }
            }
          }

          // 在流结束后，如果API没有提供token统计，则进行估算
          if (!tokenUsage && fullAssistantMessage) {
            const estimatedCompletionTokens = estimateTokens(fullAssistantMessage);
            tokenUsage = {
              prompt_tokens: estimatedPromptTokens, // 使用上面修正过的估算值
              completion_tokens: estimatedCompletionTokens,
              total_tokens: estimatedPromptTokens + estimatedCompletionTokens,
              is_estimated: true // 标记为估算值
            };
          }

          // 在流结束后发送token使用情况
          if (tokenUsage) {
            const tokenUsagePayload = `[TOKEN_USAGE]${JSON.stringify(tokenUsage)}\n\n`;
            controller.enqueue(encoder.encode(tokenUsagePayload));
          }

          // 记录token使用情况
          if (tokenUsage) {
            try {
              await recordTokenUsage({
                userId,
                providerId: model.provider.id,
                modelId: model.id,
                promptTokens: tokenUsage.prompt_tokens,
                completionTokens: tokenUsage.completion_tokens,
                totalTokens: tokenUsage.total_tokens,
                inputText: userMessage.content,
                outputText: fullAssistantMessage,
              });
            } catch (error) {
              console.error('Error recording token usage:', error);
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
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
