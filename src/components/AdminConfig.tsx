'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import { SortableList } from '@/components/SortableList';
import {
  OpenAI,
  Anthropic,
  Google,
  Microsoft,
  Meta,
  HuggingFace,
  Cohere,
  Stability,
  Replicate,
  Together,
  Perplexity,
  Mistral,
  // 添加更多 AI 提供商图标
  Baidu,
  Alibaba,
  Tencent,
  ByteDance,
  DeepSeek,
  Moonshot,
  Zhipu,
  Yi,
  SenseNova,
  Spark,
  Ollama,
  ComfyUI,
  SiliconCloud,
  Flux,
  XAI,
  Groq,
  Fireworks,
  OpenRouter,
  Bedrock,
  Azure,
  VertexAI,
  Claude,
  Gemini,
  Qwen,
  Hunyuan,
  Wenxin,
  Doubao,
  Stepfun,
  DeepInfra,
  Anyscale,
  Novita,
  Runway,
  Pika,
  Suno,
  Ideogram,
  Recraft
} from '@lobehub/icons';

interface User {
  id: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'USER' | 'GUEST';
  isActive: boolean;
  canShareAccessCode: boolean;
  createdAt: string;
  tokenUsage?: {
    totalTokens: number;
    cost: number;
  };
}

interface InviteCode {
  id: string;
  code: string;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: string;
  expiresAt?: string;
  maxUses: number;
  currentUses: number;
  createdAt: string;
  creator: {
    id: string;
    username: string;
  };
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalInviteCodes: number;
  usedInviteCodes: number;
  totalAccessCodes: number;
  usedAccessCodes: number;
}

// 图标映射 - 优先使用 lobehub icons，其次使用 emoji
const PROVIDER_ICON_MAPPING: Record<string, { component?: React.ComponentType<any>, emoji: string }> = {
  // 国际主流 AI 提供商
  openai: { component: OpenAI, emoji: '🤖' },
  anthropic: { component: Anthropic, emoji: '🧠' },
  google: { component: Google, emoji: '🔍' },
  microsoft: { component: Microsoft, emoji: '🪟' },
  meta: { component: Meta, emoji: '📘' },
  huggingface: { component: HuggingFace, emoji: '🤗' },
  cohere: { component: Cohere, emoji: '🌊' },
  stability: { component: Stability, emoji: '🎨' },
  replicate: { component: Replicate, emoji: '🔄' },
  together: { component: Together, emoji: '🤝' },
  perplexity: { component: Perplexity, emoji: '❓' },
  mistral: { component: Mistral, emoji: '🌪️' },
  groq: { component: Groq, emoji: '⚡' },
  fireworks: { component: Fireworks, emoji: '🎆' },
  openrouter: { component: OpenRouter, emoji: '🛣️' },
  bedrock: { component: Bedrock, emoji: '🏔️' },
  azure: { component: Azure, emoji: '☁️' },
  vertexai: { component: VertexAI, emoji: '🔺' },
  claude: { component: Claude, emoji: '🤖' },
  gemini: { component: Gemini, emoji: '♊' },
  xai: { component: XAI, emoji: '❌' },

  // 中国 AI 提供商
  baidu: { component: Baidu, emoji: '🐻' },
  alibaba: { component: Alibaba, emoji: '🛒' },
  tencent: { component: Tencent, emoji: '🐧' },
  bytedance: { component: ByteDance, emoji: '🎵' },
  deepseek: { component: DeepSeek, emoji: '🔍' },
  moonshot: { component: Moonshot, emoji: '🌙' },
  zhipu: { component: Zhipu, emoji: '🧠' },
  yi: { component: Yi, emoji: '🔤' },
  sensenova: { component: SenseNova, emoji: '🌟' },
  spark: { component: Spark, emoji: '⚡' },
  qwen: { component: Qwen, emoji: '🤖' },
  hunyuan: { component: Hunyuan, emoji: '🌀' },
  wenxin: { component: Wenxin, emoji: '📝' },
  doubao: { component: Doubao, emoji: '🫘' },
  stepfun: { component: Stepfun, emoji: '👣' },

  // 开源和部署平台
  ollama: { component: Ollama, emoji: '🦙' },
  comfyui: { component: ComfyUI, emoji: '🎨' },
  siliconcloud: { component: SiliconCloud, emoji: '☁️' },
  deepinfra: { component: DeepInfra, emoji: '🏗️' },
  anyscale: { component: Anyscale, emoji: '📏' },
  novita: { component: Novita, emoji: '🆕' },

  // 多媒体 AI
  flux: { component: Flux, emoji: '🌊' },
  runway: { component: Runway, emoji: '🛫' },
  pika: { component: Pika, emoji: '⚡' },
  suno: { component: Suno, emoji: '🎵' },
  ideogram: { component: Ideogram, emoji: '💭' },
  recraft: { component: Recraft, emoji: '🎨' },

  // 自定义选项
  custom: { emoji: '⚙️' },
};

// 获取提供商图标的函数
function getProviderIcon(iconKey?: string): React.ReactNode {
  if (!iconKey) return '🤖';

  // 处理自定义 emoji
  if (iconKey.startsWith('custom:')) {
    const customEmoji = iconKey.replace('custom:', '');
    return customEmoji || '⚙️';
  }

  const iconConfig = PROVIDER_ICON_MAPPING[iconKey.toLowerCase()];
  if (!iconConfig) return '🤖';

  // 优先使用 lobehub icon 组件
  if (iconConfig.component) {
    const IconComponent = iconConfig.component;
    return <IconComponent size={16} />;
  }

  // 其次使用 emoji
  return iconConfig.emoji;
}

export default function AdminConfig() {
  const { user: currentUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const toast = { success: toastSuccess, error: toastError };
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'invites' | 'system' | 'models'>('dashboard');
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'providers' | 'models'>('providers');
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [showCustomGroupModal, setShowCustomGroupModal] = useState(false);
  const [showAIRenameModal, setShowAIRenameModal] = useState(false);
  const [selectedModelsForGroup, setSelectedModelsForGroup] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 用户管理相关状态
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);

  // 邀请码管理相关状态
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [showCreateInviteModal, setShowCreateInviteModal] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({
    count: 1,
    maxUses: 1,
  });

  // 系统设置相关状态
  const [systemSettings, setSystemSettings] = useState<any>({});

  // 加载仪表板数据
  const loadDashboard = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/dashboard?adminUserId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: 加载仪表板数据失败`;
        console.error('Dashboard load error:', errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误：无法连接到服务器';
      console.error('Dashboard load error:', error);
      toast.error(`加载仪表板数据失败: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载用户列表
  const loadUsers = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/users?adminUserId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: 加载用户列表失败`;
        console.error('Users load error:', errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误：无法连接到服务器';
      console.error('Users load error:', error);
      toast.error(`加载用户列表失败: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载邀请码列表
  const loadInviteCodes = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/codes?adminUserId=${currentUser.id}&type=invite`);
      if (response.ok) {
        const data = await response.json();
        setInviteCodes(data);
      } else {
        toast.error('加载邀请码列表失败');
      }
    } catch (error) {
      toast.error('加载邀请码列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载系统设置
  const loadSystemSettings = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/admin/system-settings?adminUserId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setSystemSettings(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '加载系统设置失败';
        console.error('Load system settings error:', errorMessage);
        toast.error(`加载系统设置失败: ${errorMessage}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误：无法连接到服务器';
      console.error('Load system settings error:', error);
      toast.error(`加载系统设置失败: ${errorMessage}`);
    }
  };

  // 加载提供商和模型
  const loadProvidersAndModels = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/providers?adminUserId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Admin Providers API response:', data);
        // API 返回的是 Provider[] 数组，每个 provider 包含 models
        setProviders(data || []);

        // 提取所有模型
        const allModels = data?.flatMap((provider: any) =>
          provider.models?.map((model: any) => ({
            ...model,
            providerName: provider.displayName
          })) || []
        ) || [];
        setModels(allModels);
        console.log('Loaded providers:', data?.length || 0, 'models:', allModels.length);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '加载提供商失败';
        console.error('Load providers error:', errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误：无法连接到服务器';
      console.error('Load providers error:', error);
      toast.error(`加载提供商失败: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 创建提供商
  const createProvider = async (providerData: any) => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          ...providerData,
        }),
      });

      if (response.ok) {
        toast.success('提供商创建成功');
        loadProvidersAndModels();
        setShowAddProviderModal(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '创建提供商失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('创建提供商失败');
    }
  };

  // 更新提供商
  const updateProvider = async (providerId: string, providerData: any) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          ...providerData,
        }),
      });

      if (response.ok) {
        toast.success('提供商更新成功');
        loadProvidersAndModels();
        setEditingProvider(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '更新提供商失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('更新提供商失败');
    }
  };

  // 删除提供商
  const deleteProvider = async (providerId: string, providerName: string) => {
    if (!currentUser) return;

    if (!confirm(`确定要删除提供商 "${providerName}" 吗？这将同时删除该提供商下的所有模型。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/providers/${providerId}?adminUserId=${currentUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('提供商删除成功');
        loadProvidersAndModels();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '删除提供商失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('删除提供商失败');
    }
  };

  // 切换提供商状态
  const toggleProviderStatus = async (providerId: string, isEnabled: boolean) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          isEnabled: !isEnabled,
        }),
      });

      if (response.ok) {
        toast.success(isEnabled ? '提供商已禁用' : '提供商已启用');
        loadProvidersAndModels();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '操作失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 更新提供商排序
  const updateProviderOrder = async (reorderedProviders: any[]) => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/admin/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          providers: reorderedProviders.map((provider, index) => ({
            id: provider.id,
            order: index
          }))
        }),
      });

      if (response.ok) {
        // 更新本地状态
        setProviders(reorderedProviders);
        toast.success('提供商排序已更新');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '更新排序失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('更新排序失败');
    }
  };

  // 切换提供商展开状态
  const toggleProviderExpanded = (providerId: string) => {
    setExpandedProviders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(providerId)) {
        newSet.delete(providerId);
      } else {
        newSet.add(providerId);
      }
      return newSet;
    });
  };

  // 从v1/models API获取模型
  const fetchModelsFromAPI = async (provider: any) => {
    if (!currentUser) return;

    if (!provider.baseUrl || !provider.apiKey) {
      toast.error('提供商缺少Base URL或API Key，请先配置');
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch('/api/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];

        if (models.length === 0) {
          toast.error('未获取到任何模型');
          return;
        }

        // 批量创建模型 - 使用单个API调用
        const batchResponse = await fetch('/api/admin/models/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminUserId: currentUser.id,
            providerId: provider.id,
            models: models.map((modelId: string) => ({
              modelId: modelId,
              name: modelId, // 默认使用modelId作为名称
              isEnabled: true,
            })),
          }),
        });

        if (batchResponse.ok) {
          const result = await batchResponse.json();
          const { successCount, failCount, errors } = result;

          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          if (successCount > 0) {
            toast.success(`成功导入 ${successCount} 个模型${failCount > 0 ? `，${failCount} 个失败` : ''} (耗时 ${duration}s)`);
            loadProvidersAndModels(); // 重新加载数据
          } else {
            toast.error('所有模型导入失败');
          }

          // 如果有错误，显示详细信息
          if (errors && errors.length > 0) {
            console.warn('模型导入错误:', errors);
          }
        } else {
          const errorData = await batchResponse.json().catch(() => ({}));
          const errorMessage = errorData.error || '批量导入模型失败';
          toast.error(errorMessage);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '获取模型失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('请求超时，请检查网络连接或API配置');
      } else {
        console.error('Fetch models error:', error);
        toast.error('网络错误：无法获取模型');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 打开自定义模型添加模态框
  const openAddModelModal = (providerId: string) => {
    setSelectedProviderId(providerId);
    setShowAddModelModal(true);
  };

  // 创建自定义模型
  const createCustomModel = async (modelData: { modelId: string; name: string; description?: string }) => {
    if (!currentUser || !selectedProviderId) return;

    try {
      const response = await fetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          providerId: selectedProviderId,
          modelId: modelData.modelId,
          name: modelData.name,
          description: modelData.description,
          isEnabled: true,
        }),
      });

      if (response.ok) {
        toast.success('自定义模型创建成功');
        setShowAddModelModal(false);
        setSelectedProviderId('');
        loadProvidersAndModels(); // 重新加载数据
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '创建模型失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Create model error:', error);
      toast.error('网络错误：无法创建模型');
    }
  };

  // 切换模型状态
  const toggleModelStatus = async (modelId: string, isEnabled: boolean) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/admin/models/${modelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          isEnabled: !isEnabled,
        }),
      });

      if (response.ok) {
        toast.success(isEnabled ? '模型已禁用' : '模型已启用');
        loadProvidersAndModels();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '操作失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 编辑模型
  const editModel = (model: any) => {
    // TODO: 实现编辑模型功能
    toast.info('编辑功能开发中...');
  };

  // 删除模型
  const deleteModel = async (modelId: string, modelName: string) => {
    if (!currentUser) return;

    if (!confirm(`确定要删除模型 "${modelName}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/models/${modelId}?adminUserId=${currentUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('模型删除成功');
        loadProvidersAndModels();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '删除模型失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('删除模型失败');
    }
  };

  // 自动分组模型
  const autoGroupModels = async (providerId: string) => {
    if (!currentUser) return;

    const provider = providers.find(p => p.id === providerId);
    if (!provider || !provider.models || provider.models.length === 0) {
      toast.error('该提供商下没有模型可以分组');
      return;
    }

    try {
      // 导入分组工具函数
      const { groupModelsByCategory, getAIModelCategoryName } = await import('@/utils/aiModelUtils');

      // 按分类分组模型
      const groupedModels = groupModelsByCategory(provider.models);

      // 为每个模型设置分组
      const updatePromises = provider.models.map((model: any) => {
        const categoryName = getAIModelCategoryName(model.modelId);
        return fetch(`/api/admin/models/${model.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminUserId: currentUser.id,
            group: categoryName,
          }),
        });
      });

      await Promise.all(updatePromises);

      toast.success(`已为 ${provider.models.length} 个模型自动分组`);
      loadProvidersAndModels();
    } catch (error) {
      console.error('Auto group error:', error);
      toast.error('自动分组失败');
    }
  };

  // 打开自定义分组模态框
  const openCustomGroupModal = (providerId: string) => {
    setSelectedProviderId(providerId);
    setSelectedModelsForGroup([]);
    setShowCustomGroupModal(true);
  };

  // 打开AI重命名模态框
  const openAIRenameModal = (providerId: string) => {
    setSelectedProviderId(providerId);
    setShowAIRenameModal(true);
  };

  // 创建自定义分组
  const createCustomGroup = async (groupData: { groupName: string; modelIds: string[] }) => {
    if (!currentUser) return;

    try {
      // 为选中的模型设置自定义分组
      const updatePromises = groupData.modelIds.map((modelId: string) =>
        fetch(`/api/admin/models/${modelId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminUserId: currentUser.id,
            group: groupData.groupName,
          }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const successCount = responses.filter(r => r.ok).length;
      const failCount = responses.length - successCount;

      if (successCount > 0) {
        toast.success(`成功为 ${successCount} 个模型设置分组"${groupData.groupName}"${failCount > 0 ? `，${failCount} 个失败` : ''}`);
        loadProvidersAndModels();
        setShowCustomGroupModal(false);
        setSelectedProviderId('');
        setSelectedModelsForGroup([]);
      } else {
        toast.error('所有模型分组设置失败');
      }
    } catch (error) {
      console.error('Create custom group error:', error);
      toast.error('创建自定义分组失败');
    }
  };

  // 执行AI重命名
  const performAIRename = async (renameData: { aiModelId: string; selectedModels: string[] }) => {
    if (!currentUser) return;

    try {
      // 获取用于重命名的AI模型信息
      const aiModel = providers.flatMap(p => p.models || []).find((m: any) => m.id === renameData.aiModelId);
      if (!aiModel) {
        toast.error('未找到指定的AI模型');
        return;
      }

      // 获取要重命名的模型信息
      const modelsToRename = providers.flatMap(p => p.models || []).filter((m: any) =>
        renameData.selectedModels.includes(m.id)
      );

      if (modelsToRename.length === 0) {
        toast.error('未找到要重命名的模型');
        return;
      }

      // 构建AI重命名提示词
      const prompt = `你是一名AI专家，擅长辨认模型。你会将 AI 的模型 ID 转化为人类易读的标题。以下是几个例子：

gpt-4o-mini -> GPT-4o Mini
deepseek-chat-v3-0324 -> DeepSeek V3 [0324]
deepseek-ai/deepseek-r1 -> DeepSeek R1 {deepseek-ai}
black-forest-labs/FLUX.1-dev -> FLUX.1 Dev {black-forest-labs}
deepseek-ai/DeepSeek-R1-Distill-Qwen-14B -> DeepSeek R1 蒸馏版 Qwen 14B {deepseek-ai}
Pro/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B -> DeepSeek R1 蒸馏版 Qwen 7B {Pro/deepseek-ai}
Qwen/Qwen2.5-Coder-32B-Instruct -> Qwen2.5 Coder 32B 指示版 {Qwen}

现在请为以下模型ID生成易读的标题，每行一个，格式为"原ID -> 新标题"：

${modelsToRename.map((m: any) => m.modelId).join('\n')}`;

      // 调用AI模型进行重命名
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          modelId: aiModel.id,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error('AI重命名请求失败');
      }

      const result = await response.json();
      const aiResponse = result.content || result.message?.content || '';

      // 解析AI返回的重命名结果
      const renameMap = new Map<string, string>();
      const lines = aiResponse.split('\n').filter((line: string) => line.includes('->'));

      lines.forEach((line: string) => {
        const match = line.match(/^(.+?)\s*->\s*(.+)$/);
        if (match) {
          const originalId = match[1].trim();
          const newName = match[2].trim();
          renameMap.set(originalId, newName);
        }
      });

      // 批量更新模型名称
      const updatePromises = modelsToRename.map((model: any) => {
        const newName = renameMap.get(model.modelId);
        if (newName) {
          return fetch(`/api/admin/models/${model.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminUserId: currentUser.id,
              name: newName,
            }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const responses = await Promise.all(updatePromises);
      const successCount = responses.filter(r => r.ok).length;
      const failCount = responses.length - successCount;

      if (successCount > 0) {
        toast.success(`AI成功重命名 ${successCount} 个模型${failCount > 0 ? `，${failCount} 个失败` : ''}`);
        loadProvidersAndModels();
        setShowAIRenameModal(false);
        setSelectedProviderId('');
      } else {
        toast.error('AI重命名失败，请检查AI模型是否可用');
      }

    } catch (error) {
      console.error('AI rename error:', error);
      toast.error('AI重命名失败');
    }
  };

  // 更新模型排序
  const updateModelOrder = async (providerId: string, reorderedModels: any[]) => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/admin/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          models: reorderedModels.map((model, index) => ({
            id: model.id,
            order: index
          }))
        }),
      });

      if (response.ok) {
        // 更新本地状态
        setProviders(prevProviders =>
          prevProviders.map(provider =>
            provider.id === providerId
              ? { ...provider, models: reorderedModels }
              : provider
          )
        );
        toast.success('模型排序已更新');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '更新排序失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('更新排序失败');
    }
  };

  // 用户管理函数
  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          isActive: !isActive,
        }),
      });

      if (response.ok) {
        toast.success(isActive ? '用户已禁用' : '用户已启用');
        loadUsers();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '操作失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!currentUser) return;

    if (!confirm(`确定要删除用户 "${username}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
        }),
      });

      if (response.ok) {
        toast.success('用户删除成功');
        loadUsers();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '删除用户失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('删除用户失败');
    }
  };

  // 邀请码管理函数
  const createInviteCode = async (count: number = 1, maxUses: number = 1) => {
    if (!currentUser) return;

    try {
      const promises = [];
      for (let i = 0; i < count; i++) {
        promises.push(
          fetch('/api/admin/codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminUserId: currentUser.id,
              type: 'invite',
              maxUses,
            }),
          })
        );
      }

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.ok).length;

      if (successCount === count) {
        toast.success(`成功创建 ${count} 个邀请码`);
      } else if (successCount > 0) {
        toast.success(`成功创建 ${successCount}/${count} 个邀请码`);
      } else {
        toast.error('创建邀请码失败');
      }

      loadInviteCodes();
      setShowCreateInviteModal(false);
    } catch (error) {
      toast.error('创建邀请码失败');
    }
  };

  // 从表单创建邀请码
  const createInviteCodeFromForm = async () => {
    await createInviteCode(inviteFormData.count, inviteFormData.maxUses);
    setInviteFormData({ count: 1, maxUses: 1 }); // 重置表单
  };

  const deleteInviteCode = async (codeId: string, code: string) => {
    if (!currentUser) return;

    if (!confirm(`确定要删除邀请码 "${code}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/codes/${codeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
        }),
      });

      if (response.ok) {
        toast.success('邀请码删除成功');
        loadInviteCodes();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '删除邀请码失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('删除邀请码失败');
    }
  };

  // 系统设置函数
  const updateSystemSettings = async (settings: any) => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/admin/system-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          ...settings,
        }),
      });

      if (response.ok) {
        toast.success('系统设置更新成功');
        loadSystemSettings();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '更新系统设置失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('更新系统设置失败');
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    if (activeTab === 'dashboard') {
      loadDashboard();
      loadProvidersAndModels(); // 为了获取提供商和模型数量
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'invites') {
      loadInviteCodes();
    } else if (activeTab === 'system') {
      loadSystemSettings();
    } else if (activeTab === 'models') {
      loadProvidersAndModels();
    }
  }, [activeTab, currentUser]);

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">您没有管理员权限</p>
        <Link href="/chat" className="text-blue-500 hover:underline">
          返回聊天
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            管理员配置
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            管理系统用户、邀请码和模型配置
          </p>
        </div>

        {/* 导航标签 */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard', name: '仪表板' },
                { id: 'users', name: '用户管理' },
                { id: 'invites', name: '邀请码管理' },
                { id: 'models', name: '模型管理' },
                { id: 'system', name: '系统设置' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 模型管理 */}
        {activeTab === 'models' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                模型管理
              </h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                共 {models.length} 个模型，{providers.length} 个提供商
              </div>
            </div>

            {/* 提供商和模型管理 */}
              <div className="space-y-6">
                {/* 添加提供商按钮 */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    提供商列表
                  </h3>
                  <button
                    onClick={() => setShowAddProviderModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    添加提供商
                  </button>
                </div>

                {/* 提供商列表 */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">加载中...</p>
                    </div>
                  ) : providers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">暂无提供商数据</p>
                      <p className="text-xs text-gray-400 mt-2">调试信息: providers.length = {providers.length}</p>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                        拖拽左侧图标可调整提供商顺序
                      </div>
                      <SortableList
                        items={providers}
                        onReorder={updateProviderOrder}
                      >
                        {(provider) => (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            {/* 提供商主要信息 */}
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1">
                                  <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center mr-4">
                                    <span className="text-xl">
                                      {getProviderIcon(provider.icon)}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {provider.displayName}
                                      </div>
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        provider.isEnabled
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      }`}>
                                        {provider.isEnabled ? '启用' : '禁用'}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                      {provider.name} • {provider.baseUrl || '无Base URL'}
                                    </div>
                                    {provider.models && provider.models.length > 0 && (
                                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {provider.models.length} 个模型
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                  <button
                                    onClick={() => toggleProviderExpanded(provider.id)}
                                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                                  >
                                    {expandedProviders.has(provider.id) ? '收起模型' : '管理模型'}
                                  </button>
                                  <button
                                    onClick={() => toggleProviderStatus(provider.id, provider.isEnabled)}
                                    className={`px-3 py-1 text-xs rounded ${
                                      provider.isEnabled
                                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
                                    }`}
                                  >
                                    {provider.isEnabled ? '禁用' : '启用'}
                                  </button>
                                  <button
                                    onClick={() => setEditingProvider(provider)}
                                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                                  >
                                    编辑
                                  </button>
                                  <button
                                    onClick={() => deleteProvider(provider.id, provider.displayName)}
                                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                                  >
                                    删除
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* 模型管理折叠区域 */}
                            {expandedProviders.has(provider.id) && (
                              <div className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                    模型管理
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() => fetchModelsFromAPI(provider)}
                                      disabled={isLoading}
                                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {isLoading ? '获取中...' : 'v1/models 获取'}
                                    </button>
                                    <button
                                      onClick={() => openAddModelModal(provider.id)}
                                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition-colors"
                                    >
                                      自定义模型
                                    </button>
                                    <button
                                      onClick={() => autoGroupModels(provider.id)}
                                      className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800 transition-colors"
                                    >
                                      🤖 自动分组
                                    </button>
                                    <button
                                      onClick={() => openCustomGroupModal(provider.id)}
                                      className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:hover:bg-orange-800 transition-colors"
                                    >
                                      📁 自定义分组
                                    </button>
                                    <button
                                      onClick={() => openAIRenameModal(provider.id)}
                                      className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 transition-colors"
                                    >
                                      ✨ AI 起名
                                    </button>
                                  </div>
                                </div>

                                {/* 模型列表 */}
                                <div className="space-y-2">
                                  {provider.models && provider.models.length > 0 ? (
                                    <div>
                                      <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                                        拖拽左侧图标可调整模型顺序
                                      </div>
                                      <SortableList
                                        items={provider.models}
                                        onReorder={(reorderedModels) => updateModelOrder(provider.id, reorderedModels)}
                                      >
                                        {(model: any) => (
                                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                                            <div className="flex-1">
                                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {model.name}
                                              </div>
                                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                                ID: {model.modelId}
                                              </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <button
                                                onClick={() => toggleModelStatus(model.id, model.isEnabled)}
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer transition-colors ${
                                                  model.isEnabled
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800'
                                                }`}
                                              >
                                                {model.isEnabled ? '启用' : '禁用'}
                                              </button>
                                              <button
                                                onClick={() => editModel(model)}
                                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 transition-colors"
                                              >
                                                编辑
                                              </button>
                                              <button
                                                onClick={() => deleteModel(model.id, model.name)}
                                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 transition-colors"
                                              >
                                                删除
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </SortableList>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                      暂无模型，点击上方按钮添加模型
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </SortableList>
                    </div>
                  )}
                </div>
              </div>
          </div>
        )}

        {/* 仪表板 */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">👥</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          总用户数
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {isLoading ? '...' : (stats?.totalUsers || 0)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">✅</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          活跃用户
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {isLoading ? '...' : (stats?.activeUsers || 0)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">🤖</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          AI 模型数
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {models.length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">🏢</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          服务提供商
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {providers.length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                快速操作
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('users')}
                  className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">👥</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">管理用户</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">查看和管理系统用户</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('models')}
                  className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🤖</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">模型管理</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">配置 AI 模型和提供商</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('invites')}
                  className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎫</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">邀请码管理</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">创建和管理邀请码</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 系统状态 */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                系统状态
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">数据库连接</span>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    正常
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">API 服务</span>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    运行中
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">启用的提供商</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {providers.filter(p => p.isEnabled).length} / {providers.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 用户管理 */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                用户管理
              </h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                共 {users.length} 个用户
              </div>
            </div>

            {/* 用户列表 */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">加载中...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">暂无用户数据</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          用户信息
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          角色
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          状态
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          注册时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Token 使用
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.username}
                              </div>
                              {user.email && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {user.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                : user.role === 'USER'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {user.isActive ? '活跃' : '禁用'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {user.tokenUsage ? (
                              <div>
                                <div>{user.tokenUsage.totalTokens.toLocaleString()} tokens</div>
                                <div className="text-xs text-gray-500">
                                  ¥{user.tokenUsage.cost.toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {user.role !== 'ADMIN' && (
                                <>
                                  <button
                                    onClick={() => toggleUserStatus(user.id, user.isActive)}
                                    className={`${
                                      user.isActive
                                        ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                                        : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                    }`}
                                  >
                                    {user.isActive ? '禁用' : '启用'}
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button
                                    onClick={() => deleteUser(user.id, user.username)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    删除
                                  </button>
                                </>
                              )}
                              {user.role === 'ADMIN' && (
                                <span className="text-gray-400 text-xs">管理员</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 邀请码管理 */}
        {activeTab === 'invites' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                邀请码管理
              </h2>
              <button
                onClick={() => setShowCreateInviteModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                创建邀请码
              </button>
            </div>

            {/* 快速创建 */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                快速创建
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => createInviteCode(1, 1)}
                  className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-900 dark:text-white">单次使用</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">创建 1 个单次使用邀请码</div>
                  </div>
                </button>

                <button
                  onClick={() => createInviteCode(5, 1)}
                  className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-900 dark:text-white">批量创建</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">创建 5 个单次使用邀请码</div>
                  </div>
                </button>

                <button
                  onClick={() => createInviteCode(1, 10)}
                  className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-900 dark:text-white">多次使用</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">创建 1 个可用 10 次的邀请码</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 邀请码列表 */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  邀请码列表 ({inviteCodes.length})
                </h3>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">加载中...</p>
                </div>
              ) : inviteCodes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">暂无邀请码</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          邀请码
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          使用情况
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          状态
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          创建者
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          创建时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {inviteCodes.map((code) => (
                        <tr key={code.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-900 dark:text-white">
                              {code.code}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {code.currentUses} / {code.maxUses}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              code.currentUses >= code.maxUses
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {code.currentUses >= code.maxUses ? '已用完' : '可用'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {code.creator.username}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(code.createdAt).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => deleteInviteCode(code.id, code.code)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 系统设置 */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              系统设置
            </h2>

            {/* 基本设置 */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                基本设置
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    系统名称
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-900 dark:text-white font-medium">FIM AI</span>
                    <input
                      type="text"
                      value={systemSettings.systemNameSuffix || ' Chat'}
                      onChange={(e) => setSystemSettings((prev: any) => ({ ...prev, systemNameSuffix: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder=" Chat"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    系统描述
                  </label>
                  <textarea
                    value={systemSettings.systemDescription || '智能 AI 聊天助手'}
                    onChange={(e) => setSystemSettings((prev: any) => ({ ...prev, systemDescription: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                    placeholder="智能 AI 聊天助手"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowRegistration"
                    checked={systemSettings.allowRegistration ?? true}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, allowRegistration: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="allowRegistration" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    允许用户注册
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireInviteCode"
                    checked={systemSettings.requireInviteCode ?? true}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, requireInviteCode: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requireInviteCode" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    注册需要邀请码
                  </label>
                </div>
              </div>
            </div>

            {/* Token 设置 */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Token 设置
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    默认 Token 限额（每用户）
                  </label>
                  <input
                    type="number"
                    value={systemSettings.defaultTokenLimit || 100000}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, defaultTokenLimit: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Token 价格（每 1000 tokens，人民币分）
                  </label>
                  <input
                    type="number"
                    value={systemSettings.tokenPrice || 1}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, tokenPrice: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableTokenTracking"
                    checked={systemSettings.enableTokenTracking ?? true}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, enableTokenTracking: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableTokenTracking" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    启用 Token 使用统计
                  </label>
                </div>
              </div>
            </div>

            {/* 安全设置 */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                安全设置
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    会话超时时间（小时）
                  </label>
                  <input
                    type="number"
                    value={systemSettings.sessionTimeout || 24}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    最大并发请求数
                  </label>
                  <input
                    type="number"
                    value={systemSettings.maxConcurrentRequests || 10}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, maxConcurrentRequests: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableRateLimit"
                    checked={systemSettings.enableRateLimit ?? true}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, enableRateLimit: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableRateLimit" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    启用请求频率限制
                  </label>
                </div>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="flex justify-end">
              <button
                onClick={() => updateSystemSettings(systemSettings)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存设置
              </button>
            </div>
          </div>
        )}

        {/* 添加提供商模态框 */}
        {showAddProviderModal && (
          <ProviderModal
            isOpen={showAddProviderModal}
            onClose={() => setShowAddProviderModal(false)}
            onSubmit={createProvider}
            title="添加提供商"
          />
        )}

        {/* 编辑提供商模态框 */}
        {editingProvider && (
          <ProviderModal
            isOpen={!!editingProvider}
            onClose={() => setEditingProvider(null)}
            onSubmit={(data) => updateProvider(editingProvider.id, data)}
            title="编辑提供商"
            initialData={editingProvider}
          />
        )}

        {/* 创建邀请码模态框 */}
        {showCreateInviteModal && (
          <CreateInviteModal
            isOpen={showCreateInviteModal}
            onClose={() => setShowCreateInviteModal(false)}
            onSubmit={createInviteCodeFromForm}
            formData={inviteFormData}
            setFormData={setInviteFormData}
          />
        )}

        {/* 添加自定义模型模态框 */}
        {showAddModelModal && (
          <AddModelModal
            isOpen={showAddModelModal}
            onClose={() => {
              setShowAddModelModal(false);
              setSelectedProviderId('');
            }}
            onSubmit={createCustomModel}
          />
        )}

        {/* 自定义分组模态框 */}
        {showCustomGroupModal && (
          <CustomGroupModal
            isOpen={showCustomGroupModal}
            onClose={() => {
              setShowCustomGroupModal(false);
              setSelectedProviderId('');
              setSelectedModelsForGroup([]);
            }}
            providerId={selectedProviderId}
            providers={providers}
            onSubmit={async (groupData) => {
              await createCustomGroup(groupData);
            }}
          />
        )}

        {/* AI重命名模态框 */}
        {showAIRenameModal && (
          <AIRenameModal
            isOpen={showAIRenameModal}
            onClose={() => {
              setShowAIRenameModal(false);
              setSelectedProviderId('');
            }}
            providerId={selectedProviderId}
            providers={providers}
            onSubmit={async (renameData) => {
              await performAIRename(renameData);
            }}
          />
        )}
      </div>
    </div>
  );
}

// 提供商模态框组件
interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  title: string;
  initialData?: any;
}

function ProviderModal({ isOpen, onClose, onSubmit, title, initialData }: ProviderModalProps) {
  const { error: toastError } = useToast();
  const [formData, setFormData] = useState({
    name: initialData?.displayName || initialData?.name || '',
    baseUrl: initialData?.baseUrl || '',
    apiKey: initialData?.apiKey || '',
    icon: (() => {
      // 如果是自定义 emoji，返回 'custom'，否则返回原值
      if (initialData?.icon?.startsWith('custom:')) {
        return 'custom';
      }
      return initialData?.icon || 'custom'; // 默认为自定义 emoji
    })(),
    description: initialData?.description || '',
    isEnabled: initialData?.isEnabled ?? true,
  });

  // 自定义 emoji 状态
  const [customEmoji, setCustomEmoji] = useState(() => {
    // 如果初始数据的图标是自定义 emoji，提取出来
    if (initialData?.icon?.startsWith('custom:')) {
      return initialData.icon.replace('custom:', '');
    }
    return 'F'; // 默认为 emoji F
  });
  const [showCustomEmoji, setShowCustomEmoji] = useState(() => {
    // 如果初始数据的图标是自定义 emoji，显示自定义输入框
    return initialData?.icon?.startsWith('custom:') || true; // 默认显示自定义输入框
  });

  // 常用的 AI 提供商图标选项 - 优先使用 lobehub icons，其次使用 emoji
  const iconOptions = [
    // 国际主流 AI 提供商
    { value: 'openai', label: 'OpenAI', component: OpenAI, emoji: '🤖' },
    { value: 'anthropic', label: 'Anthropic', component: Anthropic, emoji: '🧠' },
    { value: 'google', label: 'Google', component: Google, emoji: '🔍' },
    { value: 'microsoft', label: 'Microsoft', component: Microsoft, emoji: '🪟' },
    { value: 'meta', label: 'Meta', component: Meta, emoji: '📘' },
    { value: 'huggingface', label: 'Hugging Face', component: HuggingFace, emoji: '🤗' },
    { value: 'cohere', label: 'Cohere', component: Cohere, emoji: '🌊' },
    { value: 'stability', label: 'Stability AI', component: Stability, emoji: '🎨' },
    { value: 'replicate', label: 'Replicate', component: Replicate, emoji: '🔄' },
    { value: 'together', label: 'Together AI', component: Together, emoji: '🤝' },
    { value: 'perplexity', label: 'Perplexity', component: Perplexity, emoji: '❓' },
    { value: 'mistral', label: 'Mistral AI', component: Mistral, emoji: '🌪️' },
    { value: 'groq', label: 'Groq', component: Groq, emoji: '⚡' },
    { value: 'fireworks', label: 'Fireworks AI', component: Fireworks, emoji: '🎆' },
    { value: 'openrouter', label: 'OpenRouter', component: OpenRouter, emoji: '🛣️' },
    { value: 'bedrock', label: 'AWS Bedrock', component: Bedrock, emoji: '🏔️' },
    { value: 'azure', label: 'Azure AI', component: Azure, emoji: '☁️' },
    { value: 'vertexai', label: 'Vertex AI', component: VertexAI, emoji: '🔺' },
    { value: 'claude', label: 'Claude', component: Claude, emoji: '🤖' },
    { value: 'gemini', label: 'Gemini', component: Gemini, emoji: '♊' },
    { value: 'xai', label: 'xAI', component: XAI, emoji: '❌' },

    // 中国 AI 提供商
    { value: 'baidu', label: '百度', component: Baidu, emoji: '🐻' },
    { value: 'alibaba', label: '阿里巴巴', component: Alibaba, emoji: '🛒' },
    { value: 'tencent', label: '腾讯', component: Tencent, emoji: '🐧' },
    { value: 'bytedance', label: '字节跳动', component: ByteDance, emoji: '🎵' },
    { value: 'deepseek', label: 'DeepSeek', component: DeepSeek, emoji: '🔍' },
    { value: 'moonshot', label: 'Moonshot', component: Moonshot, emoji: '🌙' },
    { value: 'zhipu', label: '智谱AI', component: Zhipu, emoji: '🧠' },
    { value: 'yi', label: '零一万物', component: Yi, emoji: '🔤' },
    { value: 'sensenova', label: '商汤', component: SenseNova, emoji: '🌟' },
    { value: 'spark', label: '讯飞星火', component: Spark, emoji: '⚡' },
    { value: 'qwen', label: '通义千问', component: Qwen, emoji: '🤖' },
    { value: 'hunyuan', label: '腾讯混元', component: Hunyuan, emoji: '🌀' },
    { value: 'wenxin', label: '文心一言', component: Wenxin, emoji: '📝' },
    { value: 'doubao', label: '豆包', component: Doubao, emoji: '🫘' },
    { value: 'stepfun', label: 'StepFun', component: Stepfun, emoji: '👣' },

    // 开源和部署平台
    { value: 'ollama', label: 'Ollama', component: Ollama, emoji: '🦙' },
    { value: 'comfyui', label: 'ComfyUI', component: ComfyUI, emoji: '🎨' },
    { value: 'siliconcloud', label: 'SiliconCloud', component: SiliconCloud, emoji: '☁️' },
    { value: 'deepinfra', label: 'DeepInfra', component: DeepInfra, emoji: '🏗️' },
    { value: 'anyscale', label: 'Anyscale', component: Anyscale, emoji: '📏' },
    { value: 'novita', label: 'Novita AI', component: Novita, emoji: '🆕' },

    // 多媒体 AI
    { value: 'flux', label: 'Flux', component: Flux, emoji: '🌊' },
    { value: 'runway', label: 'Runway', component: Runway, emoji: '🛫' },
    { value: 'pika', label: 'Pika', component: Pika, emoji: '⚡' },
    { value: 'suno', label: 'Suno', component: Suno, emoji: '🎵' },
    { value: 'ideogram', label: 'Ideogram', component: Ideogram, emoji: '💭' },
    { value: 'recraft', label: 'Recraft', component: Recraft, emoji: '🎨' },

    // 自定义选项
    { value: 'custom', label: '自定义 Emoji', emoji: '⚙️' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toastError('请填写提供商名称');
      return;
    }

    if (!formData.baseUrl) {
      toastError('请填写 Base URL');
      return;
    }

    // 如果选择了自定义 emoji，验证是否输入了内容
    if (formData.icon === 'custom' && !customEmoji.trim()) {
      toastError('请输入自定义 emoji');
      return;
    }

    // 生成 name 和 displayName
    const submitData = {
      ...formData,
      name: formData.name.toLowerCase().replace(/\s+/g, '-'),
      displayName: formData.name,
      // 如果是自定义 emoji，使用用户输入的值
      icon: formData.icon === 'custom' ? `custom:${customEmoji.trim()}` : formData.icon,
    };

    onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {title}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              提供商名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="例如: OpenAI, Anthropic"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              将自动生成内部标识符和显示名称
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              图标选择 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.icon}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, icon: value }));
                  setShowCustomEmoji(value === 'custom');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none"
                required
              >
                {iconOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-8 pointer-events-none">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">
                    {(() => {
                      const selectedOption = iconOptions.find(opt => opt.value === formData.icon);
                      if (!selectedOption) return '🤖';

                      if (selectedOption.component) {
                        const IconComponent = selectedOption.component;
                        return <IconComponent size={16} />;
                      }
                      return selectedOption.emoji;
                    })()}
                  </span>
                </div>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* 自定义 Emoji 输入框 */}
            {showCustomEmoji && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  自定义 Emoji
                </label>
                <input
                  type="text"
                  value={customEmoji}
                  onChange={(e) => {
                    // 只允许输入一个字符（emoji）
                    const value = e.target.value;
                    if (value.length <= 1) {
                      setCustomEmoji(value);
                    }
                  }}
                  placeholder="输入一个 emoji，如：🚀"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  maxLength={1}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  可以输入任何 emoji 或符号作为图标
                </p>
              </div>
            )}


          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Base URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.baseUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="https://api.openai.com/v1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="sk-..."
            />
          </div>



          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="提供商描述..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isEnabled"
              checked={formData.isEnabled}
              onChange={(e) => setFormData(prev => ({ ...prev, isEnabled: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isEnabled" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              启用提供商
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {initialData ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 创建邀请码模态框组件
interface CreateInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: {
    count: number;
    maxUses: number;
  };
  setFormData: (data: any) => void;
}

function CreateInviteModal({ isOpen, onClose, onSubmit, formData, setFormData }: CreateInviteModalProps) {
  const { error: toastError } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.count < 1 || formData.count > 100) {
      toastError('邀请码数量必须在 1-100 之间');
      return;
    }
    if (formData.maxUses < 1 || formData.maxUses > 1000) {
      toastError('使用次数必须在 1-1000 之间');
      return;
    }
    onSubmit();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          创建邀请码
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              邀请码数量 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.count}
              onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="1"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              一次最多创建 100 个邀请码
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              每个邀请码可使用次数 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={formData.maxUses}
              onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="1"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              每个邀请码最多可使用 1000 次
            </p>
          </div>

          {/* 预览信息 */}
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">创建预览</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>将创建 <span className="font-medium text-gray-900 dark:text-white">{formData.count}</span> 个邀请码</div>
              <div>每个邀请码可使用 <span className="font-medium text-gray-900 dark:text-white">{formData.maxUses}</span> 次</div>
              <div>总共可注册 <span className="font-medium text-gray-900 dark:text-white">{formData.count * formData.maxUses}</span> 个用户</div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              创建邀请码
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 添加自定义模型模态框组件
interface AddModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { modelId: string; name: string; description?: string }) => void;
}

function AddModelModal({ isOpen, onClose, onSubmit }: AddModelModalProps) {
  const { error: toastError } = useToast();
  const [formData, setFormData] = useState({
    modelId: '',
    name: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.modelId.trim()) {
      toastError('请填写模型ID');
      return;
    }

    if (!formData.name.trim()) {
      toastError('请填写模型名称');
      return;
    }

    onSubmit({
      modelId: formData.modelId.trim(),
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
    });

    // 重置表单
    setFormData({
      modelId: '',
      name: '',
      description: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          添加自定义模型
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              模型ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.modelId}
              onChange={(e) => setFormData(prev => ({ ...prev, modelId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="例如: gpt-4o-mini"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              用于API请求的模型标识符
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              模型名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="例如: GPT-4o Mini"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              用户界面显示的模型名称
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述（可选）
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="模型描述..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              添加模型
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 自定义分组模态框组件
interface CustomGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providers: any[];
  onSubmit: (data: { groupName: string; modelIds: string[] }) => void;
}

function CustomGroupModal({ isOpen, onClose, providerId, providers, onSubmit }: CustomGroupModalProps) {
  const [formData, setFormData] = useState({
    groupName: '',
    modelIds: [] as string[],
  });

  const provider = providers.find(p => p.id === providerId);
  const models = provider?.models || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.groupName.trim() || formData.modelIds.length === 0) {
      return;
    }
    onSubmit(formData);
    setFormData({ groupName: '', modelIds: [] });
  };

  const toggleModel = (modelId: string) => {
    setFormData(prev => ({
      ...prev,
      modelIds: prev.modelIds.includes(modelId)
        ? prev.modelIds.filter(id => id !== modelId)
        : [...prev.modelIds, modelId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          创建自定义分组
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              分组名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.groupName}
              onChange={(e) => setFormData(prev => ({ ...prev, groupName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="例如: 对话模型"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              选择模型 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3">
              {models.map((model: any) => (
                <label key={model.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.modelIds.includes(model.id)}
                    onChange={() => toggleModel(model.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {model.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {model.modelId}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              已选择 {formData.modelIds.length} 个模型
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!formData.groupName.trim() || formData.modelIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              创建分组
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// AI重命名模态框组件
interface AIRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providers: any[];
  onSubmit: (data: { aiModelId: string; selectedModels: string[] }) => void;
}

function AIRenameModal({ isOpen, onClose, providerId, providers, onSubmit }: AIRenameModalProps) {
  const [formData, setFormData] = useState({
    aiModelId: '',
    selectedModels: [] as string[],
  });

  const provider = providers.find(p => p.id === providerId);
  const models = provider?.models || [];

  // 获取所有可用的AI模型（用于重命名）
  const availableAIModels = providers.flatMap(p =>
    p.models?.filter((m: any) => m.isEnabled) || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.aiModelId || formData.selectedModels.length === 0) {
      return;
    }
    onSubmit(formData);
    setFormData({ aiModelId: '', selectedModels: [] });
  };

  const toggleModel = (modelId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedModels: prev.selectedModels.includes(modelId)
        ? prev.selectedModels.filter(id => id !== modelId)
        : [...prev.selectedModels, modelId]
    }));
  };

  const selectAll = () => {
    setFormData(prev => ({
      ...prev,
      selectedModels: models.map((m: any) => m.id)
    }));
  };

  const deselectAll = () => {
    setFormData(prev => ({
      ...prev,
      selectedModels: []
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          🤖 AI 智能重命名
        </h3>

        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            AI将根据预设规则将模型ID转换为易读的名称，例如：
          </p>
          <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 space-y-1">
            <li>• gpt-4o-mini → GPT-4o Mini</li>
            <li>• deepseek-chat-v3-0324 → DeepSeek V3 [0324]</li>
            <li>• deepseek-ai/deepseek-r1 → DeepSeek R1 {`{deepseek-ai}`}</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              选择AI模型进行重命名 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.aiModelId}
              onChange={(e) => setFormData(prev => ({ ...prev, aiModelId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="">请选择用于重命名的AI模型</option>
              {availableAIModels.map((model: any) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.modelId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                选择要重命名的模型 <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  全不选
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3">
              {models.map((model: any) => (
                <label key={model.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.selectedModels.includes(model.id)}
                    onChange={() => toggleModel(model.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {model.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {model.modelId}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              已选择 {formData.selectedModels.length} 个模型
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!formData.aiModelId || formData.selectedModels.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              🤖 开始AI重命名
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
