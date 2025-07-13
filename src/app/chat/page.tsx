'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useToast, ToastContainer } from '@/components/Toast';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { MessageActions } from '@/components/MessageActions';
import { AIIcon } from '@/components/AIIcon';
import { getModelGroups, getCategorySortOrder, getGroupIcon, getModelGroupsWithUserOrder, getAIModelCategoryName } from '@/utils/aiModelUtils';
import type { Message, AIProvider, AIModel, ChatHistory, TokenUsage } from '@/types';
import React from 'react'; // Added for useRef
import { MaterialChatLayout } from '@/components/MaterialChatLayout';
import { Box, Typography } from '@mui/material';

interface Message {
  id: string;
  conversationId?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  createdAt?: string; // For API response compatibility
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

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
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

function ChatPageContent() {
  const { user, chatConfig } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingFirstChar, setIsWaitingFirstChar] = useState(false); // 等待第一个字符
  const [hasChinese, setHasChinese] = useState(false); // 是否包含中文字符
  const [randomChars, setRandomChars] = useState(''); // 随机字符
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [userGroupOrders, setUserGroupOrders] = useState<Array<{ groupName: string; order: number }>>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [userSettings, setUserSettings] = useState<any>(null);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [tokenStats, setTokenStats] = useState({
    input: 0,
    output: 0,
    total: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // 生成随机汉字
  const generateRandomChinese = (length = 5) => {
    const result = [];
    for (let i = 0; i < length; i++) {
      // 常用汉字的Unicode范围大约是 0x4e00-0x9fff
      const unicode = Math.floor(Math.random() * (0x9fff - 0x4e00) + 0x4e00);
      result.push(String.fromCharCode(unicode));
    }
    return result.join('');
  };

  // 生成随机字母
  const generateRandomLetters = (length = 8) => {
    const result = [];
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < length; i++) {
      result.push(chars.charAt(Math.floor(Math.random() * chars.length)));
    }
    return result.join('');
  };

  // 更新随机字符
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isLoading) {
      // 每200ms更新一次随机字符
      intervalId = setInterval(() => {
        if (hasChinese) {
          setRandomChars(generateRandomChinese(5));
        } else {
          setRandomChars(generateRandomLetters(8));
        }
      }, 200);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoading, hasChinese]);

  // 加载提供商和模型
  useEffect(() => {
    let isMounted = true;

    const loadGroupOrders = async () => {
      try {
        // 确保用户已登录
        if (!user || !user.id) return;
        
        const response = await fetch(`/api/admin/model-groups?userId=${user.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            setUserGroupOrders(result.data);
            console.log('Loaded user group orders:', result.data);
          }
        }
      } catch (error) {
        console.error('Error loading group orders:', error);
      }
    };

    const loadUserSettings = async () => {
      try {
        const response = await fetch(`/api/user/settings?userId=${user.id}`);
        if (response.ok) {
          const settings = await response.json();
          setUserSettings(settings);
          return settings;
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
      return null;
    };

  // saveUserDefaultModel functionality has been inlined where needed

  // handleModelSelect has been inlined where needed

    const loadProviders = async () => {
      try {
        const response = await fetch(`/api/providers?userId=${user.id}`);
        if (response.ok && isMounted) {
          const result = await response.json();
          console.log('Providers API response:', result);

          // 检查是否是标准化的API响应格式
          if (result && result.success && result.data) {
            // 标准化API响应格式：{ success: true, data: [...] }
            if (Array.isArray(result.data)) {
              setProviders(result.data);
            } else {
              console.error('API返回的data字段不是数组:', result.data);
              setProviders([]);
              toast.error('加载AI模型失败：数据格式错误');
            }
          } else if (Array.isArray(result)) {
            // 直接返回数组格式（向后兼容）
            setProviders(result);
          } else {
            console.error('API返回的数据格式不正确:', result);
            setProviders([]);
            toast.error('加载AI模型失败：数据格式错误');
          }
        } else {
          if (isMounted) {
            console.error('加载提供商失败:', response.status, response.statusText);
            toast.error('加载AI模型失败');
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('加载提供商失败:', error);
          toast.error('加载AI模型失败');
          setProviders([]); // 确保在错误情况下设置为空数组
        }
      }
    };

    if (user && Array.isArray(providers) && providers.length === 0) {
      loadProviders();
      loadGroupOrders(); // 同时加载分组排序
      loadUserSettings(); // 同时加载用户设置
    } else if (user && userGroupOrders.length === 0) {
      // 如果提供商已加载但分组排序还没加载，单独加载分组排序
      loadGroupOrders();
    }

    return () => {
      isMounted = false;
    };
  }, [user, providers.length]); // 添加 providers.length 作为依赖项

  // 设置默认模型（单独的effect避免循环依赖）
  useEffect(() => {
    if (Array.isArray(providers) && providers.length > 0 && !selectedModelId) {
      // 收集所有可用的模型
      const allModels = providers.flatMap(provider =>
        provider.models?.filter(model => model.isEnabled) || []
      );

      let defaultModelId = null;

      // 1. 优先使用用户设置中的默认模型
      if (userSettings?.defaultModelId) {
        const userDefaultModel = allModels.find(model => model.id === userSettings.defaultModelId);
        if (userDefaultModel) {
          defaultModelId = userSettings.defaultModelId;
        }
      }

      // 2. 如果用户没有设置默认模型，尝试使用系统设置的默认模型
      if (!defaultModelId && !localStorage.getItem('fimai-last-used-model')) {
        // 尝试获取系统默认模型设置
        fetch('/api/admin/system-settings?key=system_default_model_id')
          .then(response => response.json())
          .then(data => {
            if (data.value) {
              const systemDefaultModel = allModels.find(model => model.id === data.value);
              if (systemDefaultModel) {
                setSelectedModelId(data.value);
                return;
              }
            }
            
            // 3. 如果系统也没有设置默认模型，使用第一个可用模型
            if (allModels.length > 0) {
              setSelectedModelId(allModels[0].id);
            }
          })
          .catch(() => {
            // 如果获取系统设置失败，回退到使用第一个可用模型
            if (allModels.length > 0) {
              setSelectedModelId(allModels[0].id);
            }
          });
      } 
      // 3. 尝试使用上次使用的模型（如果启用了此功能）
      else if (!defaultModelId && localStorage.getItem('fimai-last-used-model')) {
        const lastUsedModelId = localStorage.getItem('fimai-last-used-model');
        const lastUsedModel = allModels.find(model => model.id === lastUsedModelId);
        if (lastUsedModel) {
          defaultModelId = lastUsedModelId;
        } else if (allModels.length > 0) {
          defaultModelId = allModels[0].id;
        }
      }
      // 4. 如果以上都没有，使用第一个可用模型
      else if (!defaultModelId && allModels.length > 0) {
        defaultModelId = allModels[0].id;
      }

      if (defaultModelId) {
        setSelectedModelId(defaultModelId);
      }
    }
  }, [providers, selectedModelId, userSettings]);

  // 加载历史聊天记录
  useEffect(() => {
    const loadChatHistories = async () => {
      if (!user || !chatConfig?.canSaveToDatabase) return;

      try {
        const response = await fetch(`/api/conversations?userId=${user.id}`);
        if (response.ok) {
          const conversations = await response.json();
          const histories: ChatHistory[] = conversations.map((conv: any) => ({
            id: conv.id,
            title: conv.title,
            messages: [], // 消息会在选择对话时加载
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
            provider: conv.provider,
            model: conv.model,
          }));
          setChatHistories(histories);
        }
      } catch (error) {
        console.error('加载聊天历史失败:', error);
      }
    };

    loadChatHistories();
  }, [user, chatConfig]);

  // 保存聊天历史（对于访客用户，使用localStorage）
  const saveChatHistories = (histories: ChatHistory[]) => {
    if (user?.role === 'GUEST') {
      localStorage.setItem('fimai-chat-histories', JSON.stringify(histories));
    }
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
    // 获取系统配置的标题生成模型
    let titleModelId = null;
    try {
      const settingsResponse = await fetch(`/api/admin/system-settings?adminUserId=${user.id}&key=title_generation_model_id`);
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        titleModelId = settingsData.value;
      }
    } catch (error) {
      console.error('Error loading title generation model setting:', error);
    }

    // 如果没有配置标题生成模型，使用当前选择的模型
    let modelToUse = null;
    if (titleModelId) {
      // 查找配置的标题生成模型
      const allModels = providers.flatMap(provider =>
        provider.models?.filter(model => model.isEnabled) || []
      );
      modelToUse = allModels.find(model => model.id === titleModelId);
    }

    // 如果没有找到配置的模型，使用当前选择的模型
    if (!modelToUse) {
      const currentModel = getCurrentModel();
      if (!currentModel) {
        return firstMessage.slice(0, 20) + (firstMessage.length > 20 ? '...' : '');
      }
      modelToUse = currentModel.model;
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
          userId: user.id,
          modelId: modelToUse.id
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

  // 加载历史聊天 - 乐观更新 + 延迟验证
  const loadChatHistory = async (historyId: string) => {
    const history = chatHistories.find(h => h.id === historyId);
    if (!history) return;

    // 保存当前状态
    const previousMessages = [...messages];
    const previousChatId = currentChatId;

    // 1. 立即更新UI (保留滚动位置)
    setMessages(history.messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp || new Date(msg.createdAt || Date.now())
    })));
    setCurrentChatId(historyId);
    setShowHistoryDropdown(false);

    // 2. 如果是数据库用户，验证消息完整性
    if (user && chatConfig?.canSaveToDatabase) {
      // 延迟验证 (1秒后)
      setTimeout(async () => {
        try {
          const response = await fetch(`/api/conversations/${historyId}/messages`);
          if (response.ok) {
            const serverMessages = await response.json();
            
            // Convert string timestamps to Date objects
            const processedMessages = serverMessages.map((msg: any) => ({
              ...msg,
              timestamp: msg.createdAt ? new Date(msg.createdAt) : undefined
            }));

            // 3. 验证消息是否完整
            if (serverMessages.length !== history.messages.length) {
              // 使用服务器数据更新
              setMessages(processedMessages);
              toast.warning('聊天记录已从服务器同步');
            }
          }
        } catch (error) {
          // 验证失败，但不回滚，只提示
          console.error('Failed to verify chat history:', error);
          toast.warning('无法验证聊天记录完整性');
        }
      }, 1000);
    }
  };

  // 删除历史聊天 - 乐观更新 + 延迟验证
  const deleteChatHistory = async (historyId: string) => {
    // 保存原始数据
    const originalHistory = chatHistories.find(h => h.id === historyId);
    if (!originalHistory) return;

    // 1. 立即从UI移除 (淡出效果)
    const updatedHistories = chatHistories.filter(h => h.id !== historyId);
    saveChatHistories(updatedHistories);

    if (currentChatId === historyId) {
      setMessages([]);
      setCurrentChatId('');
    }

    toast.success('聊天记录已删除');

    // 2. 如果是数据库用户，发送删除请求
    if (user && chatConfig?.canSaveToDatabase) {
      try {
        const response = await fetch(`/api/conversations/${historyId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Delete request failed');
        }

        // 3. 延迟验证 (1.5秒后)
        setTimeout(async () => {
          try {
            const verifyResponse = await fetch(`/api/conversations/${historyId}`);

            // 4. 如果对话仍然存在，说明删除失败
            if (verifyResponse.ok) {
              // 恢复聊天记录
              const restoredHistories = [...chatHistories, originalHistory]
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
              saveChatHistories(restoredHistories);
              toast.error('聊天记录删除失败，已恢复');
            }
          } catch {
            // 404错误是正常的，说明删除成功
            console.log('聊天记录删除验证完成');
          }
        }, 1500);

      } catch (error) {
        // API调用失败，立即恢复
        const restoredHistories = [...chatHistories, originalHistory]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        saveChatHistories(restoredHistories);
        toast.error('删除操作失败，已恢复聊天记录');
      }
    }
  };

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 创建一个引用来存储最新的AI回复
  const latestAIReply = React.useRef<{id: string, content: string} | null>(null);
  
  // 更新引用，在消息更改时
  useEffect(() => {
    // 找到最后一条AI消息并更新引用
    const lastAIMessage = messages.filter(m => m.role === 'assistant').pop();
    if (lastAIMessage) {
      latestAIReply.current = {
        id: lastAIMessage.id,
        content: lastAIMessage.content
      };
    }
  }, [messages]);

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
    if (!Array.isArray(providers) || !selectedModelId) return null;

    for (const provider of providers) {
      if (provider && provider.models && Array.isArray(provider.models)) {
        const model = provider.models.find(m => m && m.id === selectedModelId);
        if (model) {
          return { model, provider };
        }
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



  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    const currentModel = getCurrentModel();
    if (!currentModel) {
      toast.error('请选择一个AI模型');
      return;
    }

    // 检查聊天权限
    try {
      const permissionResponse = await fetch(`/api/chat/permissions?userId=${user.id}&modelId=${currentModel.model.id}`);
      const permissions = await permissionResponse.json();

      if (!permissions.canChat) {
        toast.error(permissions.error || '没有聊天权限');
        return;
      }
    } catch (error) {
      toast.error('权限检查失败');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      conversationId: currentChatId || undefined,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      modelInfo: {
        modelId: currentModel.model.modelId || currentModel.model.id,
        modelName: currentModel.model.name,
        providerId: currentModel.provider.id,
        providerName: currentModel.provider.displayName || currentModel.provider.name
      }
    };

    // 检测是否包含中文
    const containsChinese = /[\u4e00-\u9fff]/.test(input);
    setHasChinese(containsChinese);
    
    // 先添加用户消息
    setMessages(prev => [...prev, userMessage]);
    
    // 然后添加AI回复消息（乐观估计）
    // 为每条消息使用唯一ID以避免合并
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`, // 确保ID唯一性
      conversationId: currentChatId || undefined,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      modelInfo: currentModel ? {
        modelId: currentModel.model.modelId || currentModel.model.id,
        modelName: currentModel.model.name,
        providerId: currentModel.provider.id,
        providerName: currentModel.provider.displayName || currentModel.provider.name
      } : undefined
    };
    
    // 存储AI消息ID以便后续使用
    const assistantMessageId = assistantMessage.id;
    latestAIReply.current = { id: assistantMessageId, content: '' };
    
    // 单独添加AI消息，确保状态更新
    setTimeout(() => {
      setMessages(prev => [...prev, assistantMessage]);
    }, 50);
    setInput('');
    setIsLoading(true);
    setIsWaitingFirstChar(true);

    // 如果是新对话且可以保存到数据库，创建对话
    let conversationId = currentChatId;
    if (!conversationId && chatConfig?.canSaveToDatabase) {
      try {
        const title = await generateChatTitle(userMessage.content);
        const convResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            providerId: currentModel.provider.id,
            modelId: currentModel.model.id,
            title,
          }),
        });

        if (convResponse.ok) {
          const conversation = await convResponse.json();
          conversationId = conversation.id;
          setCurrentChatId(conversationId);
        }
      } catch (error) {
        console.error('创建对话失败:', error);
      }
    }

    // 保存用户消息到数据库
    if (chatConfig?.canSaveToDatabase && conversationId) {
      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            userId: user.id,
            providerId: currentModel.provider.id,
            modelId: currentModel.model.id,
            role: 'user',
            content: userMessage.content,
            saveToDatabase: true,
          }),
        });
      } catch (error) {
        console.error('保存用户消息失败:', error);
      }
    }

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
          userId: user.id,
          modelId: currentModel.model.id
        }),
      });

      if (!response.ok) {
        throw new Error('API请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      // 创建消息ID变量以供后续使用
      // 我们使用之前创建的assistantMessage
      // const assistantMessageId = assistantMessage.id; // This line is no longer needed

      let finalTokenUsage: any = null;

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

              // 保存token使用信息
              if (parsed.usage) {
                finalTokenUsage = parsed.usage;
              }

              if (content) {
                // 如果是第一个字符，更新等待状态
                if (isWaitingFirstChar) {
                  setIsWaitingFirstChar(false);
                }
                
                // 更新消息内容
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + content }
                    : msg
                ));
                
                // 同时更新引用中的内容
                if (latestAIReply.current && latestAIReply.current.id === assistantMessageId) {
                  latestAIReply.current.content = latestAIReply.current.content + content;
                }
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 更新token统计
      if (finalTokenUsage) {
        setTokenStats(prev => ({
          input: prev.input + (finalTokenUsage.prompt_tokens || 0),
          output: prev.output + (finalTokenUsage.completion_tokens || 0),
          total: prev.total + (finalTokenUsage.total_tokens || 0),
        }));

        // 更新消息的token信息
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, tokenUsage: finalTokenUsage }
            : msg
        ));
      }

      // 保存AI响应到数据库
      if (chatConfig?.canSaveToDatabase && conversationId) {
        try {
          // 使用存储在引用中的最新AI回复内容
          const finalContent = latestAIReply.current?.content || '';
          
          console.log('Saving AI response to database:', {
            messageId: assistantMessageId,
            content: finalContent.slice(0, 50) + (finalContent.length > 50 ? '...' : ''),
            length: finalContent.length
          });

          await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId,
              userId: user.id,
              providerId: currentModel.provider.id,
              modelId: currentModel.model.id,
              role: 'assistant',
              content: finalContent,
              tokenUsage: finalTokenUsage,
              inputText: userMessage.content,
              outputText: finalContent,
              saveToDatabase: true,
            }),
          });
        } catch (error) {
          console.error('保存AI响应失败:', error);
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      // 错误情况下，使用新的错误消息替换之前的AI消息
      setMessages(prev => {
        // 移除最后一条消息，如果它是AI回复
        const withoutLastMessage = prev.filter((msg, idx) => 
          !(idx === prev.length - 1 && msg.role === 'assistant')
        );
        
        // 添加新的错误消息
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: '抱歉，发生了错误。请检查您的配置或稍后重试。',
          timestamp: new Date()
        };
        
        return [...withoutLastMessage, errorMessage];
      });
      toast.error('发送消息失败，请检查配置');
    } finally {
      setIsLoading(false);
      setIsWaitingFirstChar(false);
      setRandomChars(''); // 清除随机字符
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

  // 重新发送消息
  const handleResendMessage = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.role !== 'user') return;

    // 删除该消息及其后面的所有消息
    const messageIndex = messages.findIndex(m => m.id === messageId);
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);

    // 重新发送
    setInput(message.content);
    setTimeout(() => handleSend(), 100);
  };

  // 编辑并重新发送消息
  const handleEditMessage = async (messageId: string, newContent: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // 删除该消息及其后面的所有消息
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);

    // 重新发送编辑后的消息
    setInput(newContent);
    setTimeout(() => handleSend(), 100);
  };

  // 复制消息
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('消息已复制到剪贴板');
  };

  // 处理模型选择
  const handleModelSelect = (modelId: string) => {
    if (isLoading) return;

    setSelectedModelId(modelId);
    
    // 保存用户默认模型设置
    if (user && user.id) {
      fetch(`/api/user/settings?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultModelId: modelId
        }),
      }).then(async (response) => {
        if (response.ok) {
          toast.success('已设置为默认模型');
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('设置默认模型失败:', errorData);
          toast.error('设置默认模型失败');
        }
      }).catch(error => {
        console.error('保存默认模型设置失败:', error);
        toast.error('设置默认模型失败');
      });
    }
    
    // 检查是否启用记录最后使用模型功能
    fetch('/api/admin/system-settings?key=enable_last_used_model')
      .then(response => response.json())
      .then(data => {
        // 如果系统设置启用了记录最后使用模型，或者没有明确禁用（默认启用）
        if (data.value === true || data.value === undefined || data.value === null) {
          // 保存最后使用的模型ID到localStorage
          localStorage.setItem('fimai-last-used-model', modelId);
        }
      })
      .catch(() => {
        // 如果获取设置失败，默认保存（保证基本功能可用）
        localStorage.setItem('fimai-last-used-model', modelId);
      });
  };

  // 只替换return部分
  return (
    <MaterialChatLayout
      title="FimAI Chat"
      chatHistories={chatHistories}
      messages={messages}
      input={input}
      isLoading={isLoading}
      onInputChange={(e) => setInput(e.target.value)}
      onSend={handleSend}
      onNewChat={createNewChat}
      onSelectChat={loadChatHistory}
      onDeleteChat={deleteChatHistory}
      onKeyPress={handleKeyPress}
      onLogout={() => { router.push('/login'); localStorage.removeItem('accessToken'); }}
      onSettings={() => router.push('/config')}
      renderMessageContent={(message) => (
        <Box>
          <MarkdownRenderer
            content={message.content}
            isStreaming={
              message === messages[messages.length - 1] && 
              message.role === 'assistant' && 
              (isLoading || (!message.content && isWaitingFirstChar))
            }
            randomChars={
              isLoading && message === messages[messages.length - 1] && 
              message.role === 'assistant' ? randomChars : ''
            }
            isLoading={isLoading}
          />
          {message.tokenUsage && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
              Tokens: {message.tokenUsage.total_tokens || 0}
            </Typography>
          )}
        </Box>
      )}
      userName={user?.username || "用户"}
      modelName={getCurrentModel()?.model?.name}
      providerName={getCurrentModel()?.provider?.displayName || getCurrentModel()?.provider?.name}
      models={
        Array.isArray(providers) ? providers
          .flatMap(p => 
            Array.isArray(p.models) ? p.models
              .filter(m => m.isEnabled || m.enabled)
              .map(m => ({ 
                id: m.id,
                name: m.name,
                group: m.group || getAIModelCategoryName(m.modelId),
                provider: p.displayName || p.name
              }))
            : []
          )
        : []
      }
      modelGroups={userGroupOrders}
      onModelSelect={handleModelSelect}
      currentModelId={selectedModelId}
    />
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ChatPageContent />
    </ProtectedRoute>
  );
}
