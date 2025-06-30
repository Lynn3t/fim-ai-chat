'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useToast, ToastContainer } from '@/components/Toast';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { MessageActions } from '@/components/MessageActions';
import { AIIcon } from '@/components/AIIcon';
import { getModelGroups, sortModelsByOrder, sortCategoriesByOrder, sortByOrder } from '@/utils/aiModelUtils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modelInfo?: {
    modelId: string;
    modelName: string;
    providerId: string;
    providerName: string;
  };
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface AIModel {
  id: string;
  name: string;
  modelId: string;
  enabled: boolean;
  isCustom: boolean;
  customGroup?: string;
  order?: number;
}

interface AIProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  models: AIModel[];
  order?: number;
}

interface CustomGroup {
  id: string;
  name: string;
  providerId: string;
}

interface ConfigData {
  providers: AIProvider[];
  defaultProviderId: string;
  defaultModelId: string;
  customGroups: CustomGroup[];
  customCategoryOrder?: Record<string, string[]>; // 自定义分组排序
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // 加载配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('fimai-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // 兼容旧版本配置
        if (parsed.openaiApiKey || parsed.models) {
          const defaultModels = [
            { id: '1', name: 'GPT-4o Mini', modelId: 'gpt-4o-mini', enabled: true, isCustom: false }
          ];

          const migratedConfig: ConfigData = {
            providers: [
              {
                id: 'openai',
                name: 'OpenAI',
                apiKey: parsed.openaiApiKey || '',
                baseUrl: parsed.openaiBaseUrl || 'https://api.openai.com/v1',
                enabled: true,
                models: defaultModels
              }
            ],
            defaultProviderId: 'openai',
            defaultModelId: '1',
            customGroups: []
          };
          setConfig(migratedConfig);
          setSelectedModelId('1');
        } else {
          setConfig(parsed);
          setSelectedModelId(parsed.defaultModelId || '');
        }
      } catch {
        // 使用console.error而不是toast，避免依赖循环
        console.error('配置加载失败');
      }
    }
  }, []);

  // 加载历史聊天记录
  useEffect(() => {
    const savedHistories = localStorage.getItem('fimai-chat-histories');
    if (savedHistories) {
      try {
        const parsed = JSON.parse(savedHistories);
        const histories = parsed.map((h: { createdAt: string; updatedAt: string; messages: { timestamp: string }[] }) => ({
          ...h,
          createdAt: new Date(h.createdAt),
          updatedAt: new Date(h.updatedAt),
          messages: h.messages.map((m: { timestamp: string }) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
        setChatHistories(histories);
      } catch {
        console.error('历史聊天记录加载失败');
      }
    }
  }, []);

  // 保存历史聊天记录
  const saveChatHistories = (histories: ChatHistory[]) => {
    localStorage.setItem('fimai-chat-histories', JSON.stringify(histories));
    setChatHistories(histories);
  };

  // 创建新聊天
  const createNewChat = () => {
    if (messages.length > 0) {
      saveCurrentChat();
    }
    setMessages([]);
    setCurrentChatId('');
  };

  // 保存当前聊天
  const saveCurrentChat = async () => {
    if (messages.length === 0) return;

    const chatId = currentChatId || Date.now().toString();
    const now = new Date();

    // 生成聊天标题
    let title = '新对话';
    if (messages.length > 0) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        // 使用AI生成标题
        title = await generateChatTitle(firstUserMessage.content);
      }
    }

    const chatHistory: ChatHistory = {
      id: chatId,
      title,
      messages,
      createdAt: currentChatId ? chatHistories.find(h => h.id === currentChatId)?.createdAt || now : now,
      updatedAt: now
    };

    const updatedHistories = currentChatId
      ? chatHistories.map(h => h.id === currentChatId ? chatHistory : h)
      : [chatHistory, ...chatHistories];

    saveChatHistories(updatedHistories);
    setCurrentChatId(chatId);
  };

  // 生成聊天标题
  const generateChatTitle = async (firstMessage: string): Promise<string> => {
    const currentModel = getCurrentModel();
    if (!currentModel) {
      return firstMessage.slice(0, 20) + (firstMessage.length > 20 ? '...' : '');
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `请为以下对话生成一个简短的标题（不超过15个字符）：\n\n${firstMessage}`
            }
          ],
          config: {
            openaiApiKey: currentModel.provider.apiKey,
            openaiBaseUrl: currentModel.provider.baseUrl,
            model: currentModel.model.modelId
          }
        }),
      });

      if (response.ok) {
        const reader = response.body?.getReader();
        if (reader) {
          let title = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  title += content;
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
          return title.trim().slice(0, 15) || firstMessage.slice(0, 15);
        }
      }
    } catch {
      // 如果生成失败，使用默认标题
    }

    return firstMessage.slice(0, 15) + (firstMessage.length > 15 ? '...' : '');
  };

  // 加载历史聊天
  const loadChatHistory = (historyId: string) => {
    const history = chatHistories.find(h => h.id === historyId);
    if (history) {
      setMessages(history.messages);
      setCurrentChatId(historyId);
      setShowHistoryDropdown(false);
    }
  };

  // 删除历史聊天
  const deleteChatHistory = (historyId: string) => {
    const updatedHistories = chatHistories.filter(h => h.id !== historyId);
    saveChatHistories(updatedHistories);

    if (currentChatId === historyId) {
      setMessages([]);
      setCurrentChatId('');
    }

    toast.success('聊天记录已删除');
  };

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 获取当前选中的模型和提供商
  const getCurrentModel = () => {
    if (!config || !selectedModelId) return null;

    for (const provider of config.providers) {
      const model = provider.models.find(m => m.id === selectedModelId);
      if (model) {
        return { model, provider };
      }
    }
    return null;
  };

  // 获取模型显示信息
  const getModelDisplayInfo = () => {
    const currentModel = getCurrentModel();
    if (!currentModel) return { name: '未选择模型', id: '' };
    return {
      name: currentModel.model.name,
      id: currentModel.model.modelId
    };
  };

  // 获取排序后的分组列表（与config页面保持一致）
  const getSortedCategories = (providerId: string, groupedModels: Record<string, any[]>) => {
    const categories = Object.keys(groupedModels);
    const customOrder = config?.customCategoryOrder?.[providerId];

    if (customOrder) {
      // 使用自定义顺序
      const orderedCategories = customOrder.filter(name => categories.includes(name));
      const remainingCategories = categories.filter(name => !customOrder.includes(name));
      return [...orderedCategories, ...sortCategoriesByOrder(remainingCategories)];
    } else {
      // 使用默认顺序
      return sortCategoriesByOrder(categories);
    }
  };

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const currentModel = getCurrentModel();
    if (!currentModel) {
      toast.error('请先在配置页面设置AI服务提供商和模型');
      return;
    }

    if (!currentModel.provider?.apiKey) {
      toast.error('请先在配置页面设置API Key');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      modelInfo: {
        modelId: currentModel.model.modelId,
        modelName: currentModel.model.name,
        providerId: currentModel.provider.id,
        providerName: currentModel.provider.name
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          config: {
            openaiApiKey: currentModel.provider.apiKey,
            openaiBaseUrl: currentModel.provider.baseUrl,
            model: currentModel.model.modelId
          }
        }),
      });

      if (!response.ok) {
        throw new Error('API请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        modelInfo: {
          modelId: currentModel.model.modelId,
          modelName: currentModel.model.name,
          providerId: currentModel.provider.id,
          providerName: currentModel.provider.name
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 处理流式响应
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: msg.content + content }
                    : msg
                ));
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发生了错误。请检查您的配置或稍后重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('发送消息失败，请检查配置');
    } finally {
      setIsLoading(false);
      // 发送完成后保存聊天
      setTimeout(() => saveCurrentChat(), 1000);
    }
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
    toast.success('对话已清空');
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 删除消息
  const handleDeleteMessage = (messageId: string) => {
    setMessages(prev => {
      const messageIndex = prev.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return prev;

      const message = prev[messageIndex];

      // 如果删除的是用户消息，同时删除后面的AI回复
      if (message.role === 'user') {
        const nextMessage = prev[messageIndex + 1];
        if (nextMessage && nextMessage.role === 'assistant') {
          return prev.filter(m => m.id !== messageId && m.id !== nextMessage.id);
        }
      }

      return prev.filter(m => m.id !== messageId);
    });
    toast.success('消息已删除');
  };

  // 编辑并重新发送消息
  const handleEditMessage = async (messageId: string, newContent: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // 删除该消息及其后面的所有消息
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);

    // 创建新的用户消息
    const editedMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: newContent,
      timestamp: new Date(),
      modelInfo: {
        modelId: currentModel.model.modelId,
        modelName: currentModel.model.name,
        providerId: currentModel.provider.id,
        providerName: currentModel.provider.name
      }
    };

    setMessages(prev => [...prev, editedMessage]);
    setIsLoading(true);

    // 重新发送请求
    const currentModel = getCurrentModel();
    if (!currentModel) {
      toast.error('请先配置AI服务提供商和模型');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...newMessages, editedMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          config: {
            openaiApiKey: currentModel.provider.apiKey,
            openaiBaseUrl: currentModel.provider.baseUrl,
            model: currentModel.model.modelId
          }
        }),
      });

      if (!response.ok) {
        throw new Error('API请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        modelInfo: {
          modelId: currentModel.model.modelId,
          modelName: currentModel.model.name,
          providerId: currentModel.provider.id,
          providerName: currentModel.provider.name
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 处理流式响应
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: msg.content + content }
                    : msg
                ));
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('重新发送失败:', error);
      toast.error('重新发送失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 重新发送消息
  const handleResendMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.role === 'user') {
      handleEditMessage(messageId, message.content);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              FimAI Chat
            </h1>
            {/* 模型选择器 */}
            {config && config.providers.some(p => p.models.length > 0) && (
              <div className="relative" ref={modelDropdownRef}>
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center space-x-1"
                >
                  <span>
                    {(() => {
                      const current = getCurrentModel();
                      return current ? `${current.model.name}` : '选择模型';
                    })()}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showModelDropdown && (
                  <div className="absolute left-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                    {sortByOrder(config.providers).map((provider) => {
                      const enabledModels = provider.models.filter(m => m.enabled);
                      if (enabledModels.length === 0) return null;

                      const groups = getModelGroups(enabledModels, config.customGroups || []);
                      const sortedGroupNames = getSortedCategories(provider.id, groups);

                      return (
                        <div key={provider.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                          {/* 提供商标题 */}
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                            <AIIcon modelId={enabledModels[0]?.modelId || ''} size={16} />
                            <span>{provider.name}</span>
                          </div>

                          {/* 分组和模型 */}
                          {sortedGroupNames.map((groupName) => {
                            const models = groups[groupName];
                            return (
                            <div key={groupName}>
                              {/* 分组标题 */}
                              <div className="px-4 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-25 dark:bg-gray-750">
                                {groupName}
                              </div>

                              {/* 模型列表 */}
                              {models.map((model) => (
                                <button
                                  key={model.id}
                                  onClick={() => {
                                    setSelectedModelId(model.id);
                                    setShowModelDropdown(false);
                                  }}
                                  className={`w-full text-left px-6 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-3 ${
                                    selectedModelId === model.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                                  }`}
                                >
                                  <AIIcon modelId={model.modelId} size={16} />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                      {model.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {model.modelId}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* 历史聊天选择器 */}
            <div className="relative" ref={historyDropdownRef}>
              <button
                onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center space-x-1"
              >
                <span>历史聊天</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showHistoryDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    <button
                      onClick={createNewChat}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      + 新建对话
                    </button>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    {chatHistories.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                        暂无历史聊天记录
                      </div>
                    ) : (
                      chatHistories.map((history) => (
                        <div
                          key={history.id}
                          className={`flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            currentChatId === history.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                          }`}
                        >
                          <button
                            onClick={() => loadChatHistory(history.id)}
                            className="flex-1 text-left"
                          >
                            <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                              {history.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {history.updatedAt.toLocaleDateString()} {history.updatedAt.toLocaleTimeString()}
                            </div>
                          </button>
                          <button
                            onClick={() => deleteChatHistory(history.id)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="删除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleClear}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              清空对话
            </button>
            <Link
              href="/config"
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              配置
            </Link>
          </div>
        </div>
      </header>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
              <h2 className="text-2xl font-semibold mb-4">欢迎使用 FimAI Chat</h2>
              <p>开始您的AI对话之旅吧！</p>
              {(!config || config.providers.length === 0 || !config.providers.some(p => p.apiKey)) && (
                <p className="mt-4 text-red-500">
                  请先 <Link href="/config" className="underline">配置AI服务提供商</Link>
                </p>
              )}
            </div>
          ) : (
            messages.map((message) => {
              // 使用消息中保存的模型信息，如果没有则使用当前选中的模型信息（兼容旧消息）
              const modelInfo = message.modelInfo ? {
                name: message.modelInfo.modelName,
                id: message.modelInfo.modelId
              } : getModelDisplayInfo();
              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group mb-4`}
                >
                  <div className={`flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start ${message.role === 'user' ? 'space-x-reverse space-x-3' : 'space-x-3'} max-w-[85%]`}>
                    {/* 头像区域 */}
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        message.role === 'user'
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600'
                      }`}>
                        {message.role === 'user' ? (
                          'U'
                        ) : (
                          <AIIcon modelId={modelInfo.id} size={20} />
                        )}
                      </div>
                    </div>

                    {/* 消息内容区域 */}
                    <div className="flex-1">
                      {/* 发送者名称和模型信息 */}
                      <div className={`flex items-center space-x-2 mb-1 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {message.role === 'user' ? 'Username' : modelInfo.name}
                        </span>
                        {message.role === 'assistant' && modelInfo.id && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({modelInfo.id})
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>

                      {/* 消息气泡 */}
                      <div
                        className={`rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-gray-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {/* 消息内容 - 都使用Markdown渲染 */}
                        <MarkdownRenderer
                          content={message.content}
                          className={message.role === 'user' ? 'prose-invert' : ''}
                        />
                      </div>

                      {/* 消息操作按钮 - 移到气泡外 */}
                      <div className={`mt-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <MessageActions
                          content={message.content}
                          messageRole={message.role}
                          onDelete={() => handleDeleteMessage(message.id)}
                          onEdit={(newContent) => handleEditMessage(message.id, newContent)}
                          onResend={() => handleResendMessage(message.id)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span className="text-gray-500 dark:text-gray-400">AI正在思考...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的消息... (Shift+Enter换行，Enter发送)"
              className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              发送
            </button>
          </div>
        </div>
      </div>

      {/* Toast容器 */}
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
    </div>
  );
}
