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
    is_estimated?: boolean;
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false); // 添加历史记录加载状态
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
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  // 定义函数早期以便引用
  // 加载聊天历史
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

  // 保存聊天历史（对于访客用户，使用localStorage）
  const saveChatHistories = (histories: ChatHistory[]) => {
    if (user?.role === 'GUEST') {
      localStorage.setItem('fimai-chat-histories', JSON.stringify(histories));
    }
    setChatHistories(histories);
  };

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

  // 加载聊天历史的effect
  useEffect(() => {
    if (user && chatConfig?.canSaveToDatabase) {
      loadChatHistories();
    }
  }, [user, chatConfig]);

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

  // 当侧边栏打开时，加载聊天历史记录
  const handleDrawerToggle = () => {
    const newState = !drawerOpen;
    setDrawerOpen(newState);
    
    // 当打开侧边栏时，重新加载聊天历史
    if (newState && user && chatConfig?.canSaveToDatabase) {
      loadChatHistories();
    }
  };

  // 创建新聊天
  const createNewChat = () => {
    // 只有当有消息且内容有意义时才保存当前聊天
    if (messages.length > 0) {
      const hasUserMessage = messages.some(m => m.role === 'user' && m.content.trim() !== '');
      const hasAssistantMessage = messages.some(m => m.role === 'assistant' && m.content.trim() !== '');
      
      if (hasUserMessage && hasAssistantMessage) {
        saveCurrentChat();
      }
    }
    setMessages([]);
    setCurrentChatId('');
  };

  // 保存当前聊天
  const saveCurrentChat = async () => {
    // 检查是否有消息，或者消息是否都是空的
    if (!currentChatId || messages.length === 0) return;
    
    // 检查是否有用户消息，如果没有用户消息则不保存
    const hasUserMessage = messages.some(m => m.role === 'user' && m.content.trim() !== '');
    if (!hasUserMessage) return;
    
    // 检查是否有AI回复，如果没有AI回复或者AI回复都是空的，则不保存
    const hasAssistantMessage = messages.some(m => m.role === 'assistant' && m.content.trim() !== '');
    if (!hasAssistantMessage) return;

    const now = new Date();

    const updatedHistories = chatHistories.map(h => 
      h.id === currentChatId 
        ? { ...h, messages: messages, updatedAt: now } 
        : h
    );

    saveChatHistories(updatedHistories);
  };

  // 生成聊天标题
  const generateChatTitle = async (firstMessage: string): Promise<string> => {
    // 如果已经有标题且不是默认标题，则不再生成
    if (currentChatId && chatHistories.find(h => h.id === currentChatId)?.title && 
        chatHistories.find(h => h.id === currentChatId)?.title !== '新对话') {
      return chatHistories.find(h => h.id === currentChatId)?.title || '新对话';
    }
    
    try {
      // 添加延迟，避免并发请求导致的错误
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 获取系统设置的标题生成模型ID
      let titleModelId = selectedModelId;
      try {
        const titleModelResponse = await fetch('/api/admin/system-settings?key=title_generation_model_id');
        if (titleModelResponse.ok) {
          const titleModelData = await titleModelResponse.json();
          const fetchedValue = titleModelData.value;
          // 如果返回字符串 'null' 或者值为空，则使用当前聊天模型
          if (typeof fetchedValue === 'string' && fetchedValue.toLowerCase() === 'null') {
            titleModelId = selectedModelId;
          } else if (fetchedValue) {
            // 使用系统设置的模型ID
            titleModelId = fetchedValue;
          } else {
            // 系统未配置，则使用当前聊天模型
            titleModelId = selectedModelId;
          }
        }
      } catch (error) {
        console.log('获取标题生成模型失败，使用当前选择的模型');
        titleModelId = selectedModelId;
      }
      
      if (!titleModelId) {
        return '新对话';
      }
      
      // 构建标题生成请求
      const titlePrompt = `请根据以下用户消息生成一个简短的聊天标题（不超过8个字）：\n\n${firstMessage}\n\n只需回复标题文本，不要有任何其他内容。`;
     
      const titleResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: titlePrompt }],
          modelId: titleModelId,
          userId: user?.id || 'guest',
          temperature: 0.3,
          stream: false
        })
      });
      
      if (!titleResponse.ok) {
        console.error('标题生成失败:', await titleResponse.text());
        return '新对话';
      }
      
      const titleData = await titleResponse.json();
      // Extract raw content: support both top-level content and full completion format
      let rawContent = '';
      if (typeof titleData.content === 'string') {
        rawContent = titleData.content;
      } else if (titleData.choices?.[0]?.message?.content) {
        rawContent = titleData.choices[0].message.content;
      }
      // Take the first non-empty line as the title
      const firstLine = rawContent.split(/\r?\n/).find(line => line.trim()) || rawContent;
      const generatedTitle = firstLine.trim() || '新对话';
      // 限制标题长度，不超过8个字符
      return generatedTitle.slice(0, 8);
    } catch (error) {
      console.error('生成标题失败:', error);
      return '新对话';
    }
  };

  // 加载历史聊天 - 乐观更新 + 延迟验证
  const loadChatHistory = async (historyId: string) => {
    const history = chatHistories.find(h => h.id === historyId);
    if (!history) return;

    // 设置加载状态
    setIsLoadingHistory(true);

    try {
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
          } finally {
            // 无论如何，结束加载状态
            setIsLoadingHistory(false);
          }
        }, 1000);
      } else {
        // 如果不需要验证，直接结束加载状态
        setTimeout(() => setIsLoadingHistory(false), 300);
      }
    } catch (error) {
      console.error('加载聊天历史失败:', error);
      toast.error('加载聊天历史失败');
      setIsLoadingHistory(false);
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

  // 发送完成后保存聊天
  const saveMessageToDatabase = async (messageContent: string, messageRole: 'user' | 'assistant', tokenUsage?: any) => {
    if (!user || !currentChatId || !chatConfig?.canSaveToDatabase) return;
    
    const currentModel = getCurrentModel();
    if (!currentModel) return;

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentChatId,
          userId: user.id,
          providerId: currentModel.provider.id,
          modelId: currentModel.model.id,
          role: messageRole,
          content: messageContent,
          tokenUsage: tokenUsage,
          saveToDatabase: true,
        }),
      });
      
      // 保存后更新本地聊天历史
      saveCurrentChat();
    } catch (error) {
      console.error(`保存${messageRole === 'user' ? '用户' : 'AI'}消息失败:`, error);
    }
  };

  // 发送消息到AI API的核心逻辑
  const sendMessageToAI = async (userMessage: Message) => {
    setIsLoading(true);
    setIsWaitingFirstChar(true);

    const currentModel = getCurrentModel();
    if (!currentModel) {
      toast.error('未选择有效的AI模型。');
      setIsLoading(false);
      return;
    }

    const { providerId, providerName } = getModelDisplayInfo();

    const requestBody = {
      messages: [
        ...messages,
        { role: 'user', content: userMessage.content },
      ].map(({ id, timestamp, createdAt, modelInfo, tokenUsage, ...rest }) => rest), // 移除客户端特有的字段
      userId: user?.id,
      modelId: selectedModelId,
      stream: true,
      // Pass other model parameters if they exist
      temperature: currentModel.temperature,
      max_tokens: currentModel.maxTokens,
      top_p: currentModel.topP,
      frequency_penalty: currentModel.frequencyPenalty,
      presence_penalty: currentModel.presencePenalty,
    };

    let response: Response | null = null;
    let lastError: any = null;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          lastError = null;
          break; // Success, exit loop
        } else {
          lastError = new Error(`API request failed with status ${response.status}`);
          console.error(`Attempt ${attempt} failed:`, await response.text());
        }
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed with error:`, error);
      }

      if (attempt < maxRetries) {
        toast.info(`请求出错，正在进行第 ${attempt + 1} 次重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    if (!response || !response.ok) {
        const assistantMessageId = `assistant-${Date.now()}`;
        setMessages(prev => [
            ...prev,
            {
                id: assistantMessageId,
                role: 'assistant',
                content: `抱歉，AI服务暂时无法连接，请稍后再试。错误详情: ${lastError?.message || '未知错误'}`,
                timestamp: new Date(),
            },
        ]);
        toast.error('AI服务请求失败，已达到最大重试次数。');
        setIsLoading(false);
        setIsWaitingFirstChar(false);
        return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应');
    }

    let finalTokenUsage: any = null;

    // 处理流式响应
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      console.log('[SSE] raw chunk:', chunk);
      const lines = chunk.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        console.log('[SSE] raw line:', trimmedLine);
        if (!trimmedLine) continue;
        // 只处理 SSE 数据行
        const match = trimmedLine.match(/^data:\s*(.*)$/);
        if (!match) continue;
        const dataStr = match[1];
        if (dataStr === '[DONE]') continue;
        let parsed;
        try {
          parsed = JSON.parse(dataStr);
        } catch (err) {
          console.warn('Failed to parse SSE JSON:', dataStr, err);
          continue;
        }
        // 记录 token 使用信息
        if (parsed.usage) {
          finalTokenUsage = parsed.usage;
          setTokenStats(prev => ({
            input: prev.input + (parsed.usage.prompt_tokens || 0),
            output: prev.output + (parsed.usage.completion_tokens || 0),
            total: prev.total + (parsed.usage.total_tokens || 0),
          }));
        }
        // 处理内容
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          if (isWaitingFirstChar) {
            setIsWaitingFirstChar(false);
          }
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId ? { ...msg, content: msg.content + content } : msg
          ));
          if (latestAIReply.current?.id === assistantMessageId) {
            latestAIReply.current.content += content;
          }
        }
      }
    } // close while loop
    // 完成后更新状态
    setIsLoading(false);
    
    // 保存AI回复到数据库
    if (chatConfig?.canSaveToDatabase && conversationId) {
      const aiContent = latestAIReply.current?.content || '';
      try {
        await saveMessageToDatabase(aiContent, 'assistant', finalTokenUsage);
      } catch (error) {
        console.error('保存AI回复失败:', error);
      }
    }

    // 更新聊天历史
    saveCurrentChat();
  };

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    const currentModel = getCurrentModel();
    if (!currentModel) {
      toast.error('请选择一个AI模型');
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
    setInput('');
    
    // 发送消息到AI API
    await sendMessageToAI(userMessage);
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
  const handleDeleteMessage = async (messageId: string) => {
    // 查找要删除的消息
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    
    const message = messages[messageIndex];
    let newMessages = [...messages];
    
    // 如果删除的是用户消息，同时删除后面的AI回复
    if (message.role === 'user') {
      const nextMessage = messages[messageIndex + 1];
      if (nextMessage && nextMessage.role === 'assistant') {
        newMessages = messages.filter(m => m.id !== messageId && m.id !== nextMessage.id);
      } else {
        newMessages = messages.filter(m => m.id !== messageId);
      }
    } else {
      newMessages = messages.filter(m => m.id !== messageId);
    }
    
    setMessages(newMessages);
    
    // 从数据库中删除消息
    if (currentChatId && chatConfig?.canSaveToDatabase) {
      try {
        // 使用软删除API
        await fetch(`/api/conversations/${currentChatId}/messages/${messageId}`, {
          method: 'DELETE'
        });
        
        // 如果删除的是用户消息，也删除相应的AI回复
        if (message.role === 'user') {
          const nextMessage = messages[messageIndex + 1];
          if (nextMessage && nextMessage.role === 'assistant') {
            await fetch(`/api/conversations/${currentChatId}/messages/${nextMessage.id}`, {
              method: 'DELETE'
            });
          }
        }
        
        toast.success('消息已删除');
      } catch (error) {
        console.error('删除消息失败:', error);
        toast.error('删除消息失败');
      }
    } else {
      toast.success('消息已删除');
    }
    
    // 保存更新后的聊天历史
    saveCurrentChat();
  };

  // 复制消息
  const handleCopyMessage = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => toast.success('消息已复制到剪贴板'))
      .catch(() => toast.error('复制失败'));
  };

  // 编辑消息
  const handleEditMessage = (messageId: string, content: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // 删除该消息及其后面的所有消息
    const newMessages = messages.slice(0, messageIndex);
    
    // 如果删除的是用户消息，也从数据库中删除相应的消息
    if (currentChatId && chatConfig?.canSaveToDatabase) {
      const message = messages[messageIndex];
      if (message.role === 'user') {
        // 删除用户消息
        fetch(`/api/conversations/${currentChatId}/messages/${messageId}`, {
          method: 'DELETE'
        }).catch(error => console.error('删除消息失败:', error));
        
        // 删除后面的AI回复
        const nextMessage = messages[messageIndex + 1];
        if (nextMessage && nextMessage.role === 'assistant') {
          fetch(`/api/conversations/${currentChatId}/messages/${nextMessage.id}`, {
            method: 'DELETE'
          }).catch(error => console.error('删除消息失败:', error));
        }
      }
    }

    // 添加编辑后的用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      conversationId: currentChatId || undefined,
      role: 'user',
      content: content,
      timestamp: new Date(),
      modelInfo: messages[messageIndex].modelInfo
    };
    
    // 更新消息列表
    setMessages([...newMessages, userMessage]);
    
    // 发送消息到AI API
    sendMessageToAI(userMessage);
  };

  // 重试消息
  const handleRetryMessage = (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const messageToRetry = messages[messageIndex];
    if (messageToRetry.role !== 'user') return;

    // 移除此消息之后的所有消息
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);

    // 重新发送
    sendMessageToAI(messageToRetry);
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

  // 更新聊天标题
  const handleChatTitleChange = async (newTitle: string) => {
    if (!currentChatId || !chatConfig?.canSaveToDatabase) return;
    
    try {
      await fetch(`/api/conversations/${currentChatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      
      // 更新本地聊天历史
      const updatedHistories = chatHistories.map(h => 
        h.id === currentChatId ? { ...h, title: newTitle } : h
      );
      saveChatHistories(updatedHistories);
      toast.success('标题已更新');
    } catch (error) {
      toast.error('更新标题失败');
      console.error('更新标题失败:', error);
    }
  };

  // 只替换return部分
  return (
    <MaterialChatLayout
      title="FimAI Chat"
      chatHistories={chatHistories}
      messages={messages}
      input={input}
      isLoading={isLoading}
      isLoadingHistory={isLoadingHistory}
      onInputChange={(e) => setInput(e.target.value)}
      onSend={handleSend}
      onNewChat={createNewChat}
      onSelectChat={loadChatHistory}
      onDeleteChat={deleteChatHistory}
      onKeyPress={handleKeyPress}
      onLogout={() => { router.push('/login'); localStorage.removeItem('accessToken'); }}
      onSettings={() => router.push('/config')}
      onCopyMessage={handleCopyMessage}
      onDeleteMessage={handleDeleteMessage}
      onEditMessage={handleEditMessage}
      onRetryMessage={handleRetryMessage}
      drawerOpen={drawerOpen}
      onDrawerToggle={handleDrawerToggle}
      renderMessageContent={(message) => (
        <Box sx={{ my: 0 }}>
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
        </Box>
      )}
      userName={user?.username || "用户"}
      modelName={getCurrentModel()?.model?.name}
      providerName={getCurrentModel()?.provider?.displayName || getCurrentModel()?.provider?.name}
      chatTitle={currentChatId ? chatHistories.find(h => h.id === currentChatId)?.title || '新对话' : '新对话'}
      onChatTitleChange={handleChatTitleChange}
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
