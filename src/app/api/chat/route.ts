import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkChatPermissions } from '@/lib/chat-permissions';
import { estimateTokens, extractTokenUsage } from '@/lib/token-counter';
import { recordTokenUsage } from '@/lib/db/token-usage';
import { getCurrentUser } from '@/lib/auth-middleware';
import { handleApiError, AppError } from '@/lib/error-handler';
import logger from '@/lib/logger';

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
    // 从请求中获取用户
    const user = await getCurrentUser(request);
    if (!user) {
      throw AppError.unauthorized('请先登录');
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
      throw AppError.badRequest('缺少必需字段: messages, modelId');
    }

    // 检查用户聊天权限
    const permissions = await checkChatPermissions(user.userId, modelId);
    if (!permissions.canChat) {
      throw AppError.forbidden(permissions.error || '无权使用此模型');
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
      throw AppError.notFound('模型或提供商不存在');
    }

    if (!model.isEnabled || !model.provider.isEnabled) {
      throw AppError.forbidden('模型或提供商已禁用');
    }

    if (!model.provider.apiKey || !model.provider.baseUrl) {
      throw AppError.internal('提供商配置不完整');
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
      logger.error('AI API Error', { status: response.status, error: errorData }, 'CHAT');
      throw AppError.externalApi('AI API 请求失败');
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

        const decoder = new TextDecoder(); // 实例化在循环外部
        let fullAssistantMessage = ''; // 用于记录完整的助手回复内容
        let tokenUsage: any = null; // 用于记录token使用情况
        let buffer = ''; // 用于处理被分割的JSON数据

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 解码数据，使用 stream: true 保持多字节字符状态
            const chunk = decoder.decode(value, { stream: true });
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
                userId: user.userId,
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
          logger.error('Stream processing error', error, 'CHAT');
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
    return handleApiError(error, 'POST /api/chat');
  }
}
