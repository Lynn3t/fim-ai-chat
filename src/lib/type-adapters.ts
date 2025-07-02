/**
 * 类型适配器 - 处理不同组件间的类型转换
 */

import type { 
  Message as GlobalMessage, 
  AIProvider as GlobalAIProvider, 
  AIModel as GlobalAIModel,
  ChatHistory as GlobalChatHistory,
  TokenUsage as GlobalTokenUsage
} from '@/types';

// 聊天页面的本地类型定义
export interface ChatMessage {
  id: string;
  conversationId?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modelInfo?: {
    modelId: string;
    modelName: string;
    providerId: string;
    providerName: string;
  };
  tokenUsage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface ChatAIModel {
  id: string;
  name: string;
  modelId: string;
  enabled: boolean;
  isCustom: boolean;
  customGroup?: string;
  order?: number;
}

export interface ChatAIProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  models: ChatAIModel[];
  order?: number;
}

export interface ChatHistoryLocal {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  provider?: {
    id: string;
    name: string;
  };
  model?: {
    id: string;
    name: string;
  };
}

/**
 * 将全局Message类型转换为聊天页面Message类型
 */
export function adaptGlobalMessageToChatMessage(globalMessage: GlobalMessage): ChatMessage {
  return {
    id: globalMessage.id,
    role: globalMessage.role === 'system' ? 'assistant' : globalMessage.role,
    content: globalMessage.content,
    timestamp: globalMessage.timestamp,
    modelInfo: globalMessage.modelId ? {
      modelId: globalMessage.modelId,
      modelName: '', // 需要从其他地方获取
      providerId: globalMessage.providerId || '',
      providerName: '', // 需要从其他地方获取
    } : undefined,
    tokenUsage: globalMessage.tokenUsage ? {
      prompt_tokens: globalMessage.tokenUsage.promptTokens,
      completion_tokens: globalMessage.tokenUsage.completionTokens,
      total_tokens: globalMessage.tokenUsage.totalTokens,
    } : undefined,
  };
}

/**
 * 将聊天页面Message类型转换为全局Message类型
 */
export function adaptChatMessageToGlobalMessage(chatMessage: ChatMessage): GlobalMessage {
  return {
    id: chatMessage.id,
    role: chatMessage.role,
    content: chatMessage.content,
    timestamp: chatMessage.timestamp,
    modelId: chatMessage.modelInfo?.modelId,
    providerId: chatMessage.modelInfo?.providerId,
    tokenUsage: chatMessage.tokenUsage ? {
      promptTokens: chatMessage.tokenUsage.prompt_tokens || 0,
      completionTokens: chatMessage.tokenUsage.completion_tokens || 0,
      totalTokens: chatMessage.tokenUsage.total_tokens || 0,
    } : undefined,
  };
}

/**
 * 将全局AIProvider类型转换为聊天页面AIProvider类型
 */
export function adaptGlobalProviderToChatProvider(globalProvider: GlobalAIProvider): ChatAIProvider {
  return {
    id: globalProvider.id,
    name: globalProvider.displayName || globalProvider.name,
    apiKey: '', // 敏感信息不传递到前端
    baseUrl: globalProvider.baseUrl,
    enabled: globalProvider.isEnabled,
    models: globalProvider.models.map(adaptGlobalModelToChatModel),
    order: globalProvider.order,
  };
}

/**
 * 将全局AIModel类型转换为聊天页面AIModel类型
 */
export function adaptGlobalModelToChatModel(globalModel: GlobalAIModel): ChatAIModel {
  return {
    id: globalModel.id,
    name: globalModel.name,
    modelId: globalModel.modelId,
    enabled: globalModel.isEnabled,
    isCustom: false, // 默认值，可以根据需要调整
    customGroup: globalModel.group,
    order: globalModel.order,
  };
}

/**
 * 将全局ChatHistory类型转换为聊天页面ChatHistory类型
 */
export function adaptGlobalHistoryToChatHistory(globalHistory: GlobalChatHistory): ChatHistoryLocal {
  return {
    id: globalHistory.id,
    title: globalHistory.title,
    messages: globalHistory.messages.map(adaptGlobalMessageToChatMessage),
    createdAt: globalHistory.createdAt,
    updatedAt: globalHistory.updatedAt,
    provider: globalHistory.provider ? {
      id: globalHistory.provider.id,
      name: globalHistory.provider.displayName || globalHistory.provider.name,
    } : undefined,
    model: globalHistory.model ? {
      id: globalHistory.model.id,
      name: globalHistory.model.name,
    } : undefined,
  };
}

/**
 * 批量转换提供商列表
 */
export function adaptGlobalProvidersToChatProviders(globalProviders: GlobalAIProvider[]): ChatAIProvider[] {
  return globalProviders.map(adaptGlobalProviderToChatProvider);
}

/**
 * 批量转换消息列表
 */
export function adaptGlobalMessagesToChatMessages(globalMessages: GlobalMessage[]): ChatMessage[] {
  return globalMessages.map(adaptGlobalMessageToChatMessage);
}

/**
 * 批量转换聊天历史列表
 */
export function adaptGlobalHistoriesToChatHistories(globalHistories: GlobalChatHistory[]): ChatHistoryLocal[] {
  return globalHistories.map(adaptGlobalHistoryToChatHistory);
}

/**
 * 验证消息格式
 */
export function validateChatMessage(message: any): message is ChatMessage {
  return (
    typeof message === 'object' &&
    typeof message.id === 'string' &&
    typeof message.content === 'string' &&
    ['user', 'assistant'].includes(message.role) &&
    message.timestamp instanceof Date
  );
}

/**
 * 验证提供商格式
 */
export function validateChatProvider(provider: any): provider is ChatAIProvider {
  return (
    typeof provider === 'object' &&
    typeof provider.id === 'string' &&
    typeof provider.name === 'string' &&
    typeof provider.baseUrl === 'string' &&
    typeof provider.enabled === 'boolean' &&
    Array.isArray(provider.models)
  );
}

/**
 * 安全的类型转换
 */
export function safeAdaptGlobalMessageToChatMessage(globalMessage: any): ChatMessage | null {
  try {
    if (!globalMessage || typeof globalMessage !== 'object') {
      return null;
    }
    
    return adaptGlobalMessageToChatMessage(globalMessage as GlobalMessage);
  } catch (error) {
    console.error('Failed to adapt global message to chat message:', error);
    return null;
  }
}

/**
 * 安全的批量类型转换
 */
export function safeAdaptGlobalProvidersToChatProviders(globalProviders: any[]): ChatAIProvider[] {
  if (!Array.isArray(globalProviders)) {
    return [];
  }
  
  return globalProviders
    .map(provider => {
      try {
        return adaptGlobalProviderToChatProvider(provider as GlobalAIProvider);
      } catch (error) {
        console.error('Failed to adapt provider:', error);
        return null;
      }
    })
    .filter((provider): provider is ChatAIProvider => provider !== null);
}

/**
 * 创建默认的聊天消息
 */
export function createDefaultChatMessage(
  content: string,
  role: 'user' | 'assistant' = 'user'
): ChatMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
    timestamp: new Date(),
  };
}

/**
 * 创建错误消息
 */
export function createErrorMessage(errorText: string): ChatMessage {
  return createDefaultChatMessage(
    `❌ 错误: ${errorText}`,
    'assistant'
  );
}

/**
 * 创建系统消息
 */
export function createSystemMessage(systemText: string): ChatMessage {
  return createDefaultChatMessage(
    `ℹ️ ${systemText}`,
    'assistant'
  );
}
