'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useToast, ToastContainer } from '@/components/Toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIModel {
  id: string;
  name: string;
  modelId: string;
  enabled: boolean;
  isCustom: boolean;
}

interface AIProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  models: AIModel[];
}

interface ConfigData {
  providers: AIProvider[];
  defaultProviderId: string;
  defaultModelId: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
            { id: '1', name: 'GPT-3.5 Turbo', modelId: 'gpt-3.5-turbo', enabled: true, isCustom: false },
            { id: '2', name: 'GPT-4', modelId: 'gpt-4', enabled: true, isCustom: false },
            { id: '3', name: 'GPT-4 Turbo', modelId: 'gpt-4-turbo', enabled: true, isCustom: false },
            { id: '4', name: 'GPT-4o', modelId: 'gpt-4o', enabled: true, isCustom: false },
            { id: '5', name: 'GPT-4o Mini', modelId: 'gpt-4o-mini', enabled: true, isCustom: false }
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
            defaultModelId: '1'
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

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      timestamp: new Date()
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
        timestamp: new Date()
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
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">模型:</span>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择模型</option>
                  {config.providers.map((provider) =>
                    provider.models.filter(m => m.enabled).map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.modelId}) - {provider.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
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
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
              className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
