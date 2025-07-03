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
import { getModelGroups, getCategorySortOrder, getGroupIcon, getModelGroupsWithUserOrder } from '@/utils/aiModelUtils';
import type { Message, AIProvider, AIModel, ChatHistory, TokenUsage } from '@/types';

interface Message {
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

  // 加载提供商和模型
  useEffect(() => {
    let isMounted = true;

    const loadGroupOrders = async () => {
      try {
        const response = await fetch(`/api/admin/model-groups?userId=${user.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            setUserGroupOrders(result.data);
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

  // 保存用户默认模型
  const saveUserDefaultModel = async (modelId: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          defaultModelId: modelId,
        }),
      });

      if (response.ok) {
        // 更新本地状态
        setUserSettings(prev => ({
          ...prev,
          defaultModelId: modelId,
        }));
      }
    } catch (error) {
      console.error('Error saving default model:', error);
    }
  };

  // 处理模型选择
  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    setShowModelDropdown(false);
    // 保存为用户默认模型
    saveUserDefaultModel(modelId);
  };

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
    }

    return () => {
      isMounted = false;
    };
  }, [user]); // 只依赖user，避免无限循环

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

      // 2. 如果用户没有设置默认模型或默认模型不可用，使用第一个可用模型
      if (!defaultModelId && allModels.length > 0) {
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
    setMessages(history.messages);
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

            // 3. 验证消息是否完整
            if (serverMessages.length !== history.messages.length) {
              // 使用服务器数据更新
              setMessages(serverMessages);
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

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

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

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        conversationId: conversationId || undefined,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        modelInfo: {
          modelId: currentModel.model.modelId || currentModel.model.id,
          modelName: currentModel.model.name,
          providerId: currentModel.provider.id,
          providerName: currentModel.provider.displayName || currentModel.provider.name
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

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

      // 更新token统计
      if (finalTokenUsage) {
        setTokenStats(prev => ({
          input: prev.input + (finalTokenUsage.prompt_tokens || 0),
          output: prev.output + (finalTokenUsage.completion_tokens || 0),
          total: prev.total + (finalTokenUsage.total_tokens || 0),
        }));

        // 更新消息的token信息
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessage.id
            ? { ...msg, tokenUsage: finalTokenUsage }
            : msg
        ));
      }

      // 保存AI响应到数据库
      if (chatConfig?.canSaveToDatabase && conversationId) {
        try {
          const finalMessage = messages.find(m => m.id === assistantMessage.id);
          await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId,
              userId: user.id,
              providerId: currentModel.provider.id,
              modelId: currentModel.model.id,
              role: 'assistant',
              content: finalMessage?.content || assistantMessage.content,
              tokenUsage: finalTokenUsage,
              inputText: userMessage.content,
              outputText: finalMessage?.content || assistantMessage.content,
              saveToDatabase: true,
            }),
          });
        } catch (error) {
          console.error('保存AI响应失败:', error);
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
            {providers && Array.isArray(providers) && providers.some(p => p.models && p.models.length > 0) && (
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
                    {(() => {
                      // 收集所有启用的模型
                      const allEnabledModels = (Array.isArray(providers) ? providers : []).flatMap(provider =>
                        (provider.models || [])
                          .filter(m => m.isEnabled)
                          .map(model => ({
                            ...model,
                            providerName: provider.displayName || provider.name,
                            providerId: provider.id
                          }))
                      );

                      if (allEnabledModels.length === 0) {
                        return (
                          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            没有可用的模型
                          </div>
                        );
                      }

                      // 使用用户自定义分组排序对模型进行分组
                      const groupsWithOrder = getModelGroupsWithUserOrder(allEnabledModels, userGroupOrders);

                      return groupsWithOrder.map((group) => (
                        <div key={group.groupName} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                          {/* 分组标题 */}
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                            <AIIcon modelId={group.models[0]?.modelId || ''} size={16} />
                            <span>{group.groupName} ({group.models.length})</span>
                          </div>

                          {/* 分组内的模型列表 */}
                          {group.models.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => handleModelSelect(model.id)}
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
                                  {model.modelId} • {model.providerName}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ));
                    })()}
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
              {user && (
                <p className="mt-2 text-sm">
                  欢迎，{user.username}！您的角色：{user.role === 'ADMIN' ? '管理员' : user.role === 'USER' ? '用户' : '访客'}
                </p>
              )}
              {(!providers || !Array.isArray(providers) || providers.length === 0 || !providers.some(p => p.models && p.models.length > 0)) && (
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
                          {message.role === 'user' ? (user?.username || 'User') : modelInfo.name}
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
          {/* Token统计显示 */}
          <div className="flex justify-end mb-3">
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span>Input: {tokenStats.input}</span>
              <span>Output: {tokenStats.output}</span>
              <span>Total: {tokenStats.total}</span>
            </div>
          </div>

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

export default function ChatPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ChatPageContent />
    </ProtectedRoute>
  );
}
