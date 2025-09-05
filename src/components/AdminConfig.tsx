'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import { SortableList } from '@/components/SortableList';
import TokenStatsAdmin from '@/components/TokenStatsAdmin';
import {
  Box,
  Typography,
  Container,
  Paper,
  Tabs,
  Tab,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material';
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
import { getModelGroups, getCategorySortOrder, sortGroupsByUserOrder, getModelGroupsWithUserOrder } from '@/utils/aiModelUtils';
import { SortableModelGroupList } from './SortableModelGroupList';

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

// 图标映射 - 仅使用黑白风格的图标组件
const PROVIDER_ICON_MAPPING: Record<string, { component?: React.ComponentType<any>, emoji?: string }> = {
  // 国际主流 AI 提供商
  openai: { component: OpenAI },
  anthropic: { component: Anthropic },
  google: { component: Google },
  microsoft: { component: Microsoft },
  meta: { component: Meta },
  huggingface: { component: HuggingFace },
  cohere: { component: Cohere },
  stability: { component: Stability },
  replicate: { component: Replicate },
  together: { component: Together },
  perplexity: { component: Perplexity },
  mistral: { component: Mistral },
  groq: { component: Groq },
  fireworks: { component: Fireworks },
  openrouter: { component: OpenRouter },
  bedrock: { component: Bedrock },
  azure: { component: Azure },
  vertexai: { component: VertexAI },
  claude: { component: Claude },
  gemini: { component: Gemini },
  xai: { component: XAI },

  // 中国 AI 提供商
  baidu: { component: Baidu },
  alibaba: { component: Alibaba },
  tencent: { component: Tencent },
  bytedance: { component: ByteDance },
  deepseek: { component: DeepSeek },
  moonshot: { component: Moonshot },
  zhipu: { component: Zhipu },
  yi: { component: Yi },
  sensenova: { component: SenseNova },
  spark: { component: Spark },
  qwen: { component: Qwen },
  hunyuan: { component: Hunyuan },
  wenxin: { component: Wenxin },
  doubao: { component: Doubao },
  stepfun: { component: Stepfun },

  // 开源和部署平台
  ollama: { component: Ollama },
  comfyui: { component: ComfyUI },
  siliconcloud: { component: SiliconCloud },
  deepinfra: { component: DeepInfra },
  anyscale: { component: Anyscale },
  novita: { component: Novita },

  // 多媒体 AI
  flux: { component: Flux },
  runway: { component: Runway },
  pika: { component: Pika },
  suno: { component: Suno },
  ideogram: { component: Ideogram },
  recraft: { component: Recraft },

  // 自定义选项
  custom: {},
};

// 获取提供商图标的函数
function getProviderIcon(iconKey?: string): React.ReactNode {
  if (!iconKey) return <span style={{ fontWeight: 'bold' }}>AI</span>;

  // 处理自定义图标，显示实际的emoji
  if (iconKey.startsWith('custom:')) {
    const customEmoji = iconKey.replace('custom:', '');
    return <span style={{ fontSize: '16px' }}>{customEmoji || '⚙️'}</span>;
  }

  const iconConfig = PROVIDER_ICON_MAPPING[iconKey.toLowerCase()];
  if (!iconConfig) return <span style={{ fontWeight: 'bold' }}>AI</span>;

  // 只使用组件图标，不使用emoji
  if (iconConfig.component) {
    const IconComponent = iconConfig.component;
    return <IconComponent size={16} style={{ color: '#000000' }} />;
  }

  // 如果没有组件图标，使用文本替代
  return <span style={{ fontWeight: 'bold' }}>AI</span>;
}

export default function AdminConfig() {
  const { user: currentUser, authenticatedFetch } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const toast = { success: toastSuccess, error: toastError };
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'invites' | 'system' | 'models'>('dashboard');
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'providers' | 'models'>('providers');
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [showEditModelModal, setShowEditModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [showCustomGroupModal, setShowCustomGroupModal] = useState(false);
  const [showAIRenameModal, setShowAIRenameModal] = useState(false);
  const [selectedModelsForGroup, setSelectedModelsForGroup] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userGroupOrders, setUserGroupOrders] = useState<Array<{ groupName: string; order: number }>>([]);

  // 用户管理相关状态
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);

  // 邀请码管理相关状态
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [showCreateInviteModal, setShowCreateInviteModal] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({ count: 1, maxUses: 1 });
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    userId: '',
    username: '',
    newPassword: ''
  });
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // 创建用户相关状态
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserData, setCreateUserData] = useState({
    username: '',
    email: '',
    password: '',
    isGeneratingPassword: false
  });

  // 系统设置相关状态
  const [systemSettings, setSystemSettings] = useState<any>({});

  // 在组件初始化状态的部分，添加token统计相关状态
  const [tokenUsageStats, setTokenUsageStats] = useState<{
    totalTokens: number;
    userLeaderboard: Array<{
      userId: string;
      username: string;
      role: string;
      totalTokens: number;
      totalCost: number;
      messageCount: number;
    }>;
    modelStats: Array<{
      modelId: string;
      modelName: string;
      providerName: string;
      totalTokens: number;
      totalCost: number;
      messageCount: number;
      userCount: number;
    }>;
  }>({
    totalTokens: 0,
    userLeaderboard: [],
    modelStats: []
  });

  // 删除用户相关状态
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<{ id: string; username: string } | null>(null);
  // 邀请码删除相关状态
  const [showDeleteInviteDialog, setShowDeleteInviteDialog] = useState(false);
  const [deletingInvite, setDeletingInvite] = useState<{ id: string; code: string } | null>(null);

  // 加载仪表板数据
  const loadDashboard = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      const response = await authenticatedFetch('/api/admin/dashboard');
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
      const response = await authenticatedFetch('/api/admin/users');
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
      const response = await authenticatedFetch('/api/admin/codes?type=invite');
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
      const response = await authenticatedFetch('/api/admin/system-settings');
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

  // 加载分组排序配置
  const loadGroupOrders = async () => {
    if (!currentUser) return;

    try {
      const response = await authenticatedFetch('/api/admin/model-groups');
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

  // 加载提供商和模型
  const loadProvidersAndModels = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const response = await authenticatedFetch('/api/admin/providers');
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
      const response = await authenticatedFetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      const response = await authenticatedFetch(`/api/admin/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      const response = await authenticatedFetch(`/api/admin/providers/${providerId}`, {
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

  // 切换提供商状态 - 乐观更新 + 延迟验证
  const toggleProviderStatus = async (providerId: string, isEnabled: boolean) => {
    if (!currentUser) return;

    // 保存原始状态
    const originalProvider = providers.find(p => p.id === providerId);
    if (!originalProvider) return;

    // 1. 立即更新UI (乐观更新)
    setProviders(prev => prev.map(provider =>
      provider.id === providerId
        ? { ...provider, isEnabled: !isEnabled }
        : provider
    ));

    // 显示即时反馈
    toast.success(isEnabled ? '提供商已禁用' : '提供商已启用');

    // 2. 发送API请求
    try {
      const response = await authenticatedFetch(`/api/admin/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: !isEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      // 3. 延迟验证 (1.5秒后)
      setTimeout(async () => {
        try {
          const verifyResponse = await authenticatedFetch(`/api/admin/providers/${providerId}`);
          if (verifyResponse.ok) {
            const provider = await verifyResponse.json();

            // 4. 验证状态是否正确
            if (provider.isEnabled !== !isEnabled) {
              // 回滚状态
              setProviders(prev => prev.map(p =>
                p.id === providerId
                  ? { ...p, isEnabled: originalProvider.isEnabled }
                  : p
              ));
              toast.error('状态更新失败，已恢复原状态');
            }
          }
        } catch {
          // 验证失败，回滚
          setProviders(prev => prev.map(p =>
            p.id === providerId
              ? { ...p, isEnabled: originalProvider.isEnabled }
              : p
          ));
          toast.error('无法验证状态更新，已恢复原状态');
        }
      }, 1500);

    } catch (error) {
      // API调用失败，立即回滚
      setProviders(prev => prev.map(p =>
        p.id === providerId
          ? { ...p, isEnabled: originalProvider.isEnabled }
          : p
      ));
      toast.error('操作失败，已恢复原状态');
    }
  };

  // 更新提供商排序 - 乐观更新 + 延迟验证
  const updateProviderOrder = async (reorderedProviders: any[]) => {
    if (!currentUser) return;

    // 保存原始提供商顺序
    const originalProviders = [...providers];

    console.log('Provider order update:', {
      original: originalProviders.map(p => ({ id: p.id, name: p.name, order: p.order })),
      reordered: reorderedProviders.map((p, index) => ({ id: p.id, name: p.name, newOrder: index }))
    });

    // 1. 立即更新UI (乐观更新)
    setProviders(reorderedProviders);

    // 显示即时反馈
    toast.success('提供商排序已更新');

    try {
      // 2. 延迟验证 - 发送API请求
      const updateData = {
        adminUserId: currentUser.id,
        providers: reorderedProviders.map((provider, index) => ({
          id: provider.id,
          order: index
        }))
      };

      console.log('Sending provider order update:', updateData);

      const response = await authenticatedFetch('/api/admin/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        // 3. 如果API失败，回滚到原始状态
        setProviders(originalProviders);

        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '更新排序失败';
        toast.error(`排序更新失败: ${errorMessage}`);

        console.error('Provider order update failed:', errorData);
      } else {
        // 4. 延迟验证成功，可选择性地重新加载数据确保一致性
        setTimeout(async () => {
          try {
            await loadProvidersAndModels();
          } catch (error) {
            console.warn('Failed to reload providers after order update:', error);
          }
        }, 2000); // 2秒后重新加载验证
      }
    } catch (error) {
      // 5. 网络错误或其他异常，回滚状态
      setProviders(originalProviders);
      toast.error('网络错误，排序更新失败');
      console.error('Provider order update error:', error);
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

  // 切换分组展开状态
  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // 处理分组排序 - 乐观更新 + 延迟验证
  const handleGroupReorder = async (providerId: string, reorderedGroups: any[]) => {
    if (!currentUser) return;

    // 保存原始分组排序
    const originalGroupOrders = [...userGroupOrders];

    // 1. 立即更新UI (乐观更新)
    const newGroupOrders = reorderedGroups.map((group, index) => ({
      groupName: group.name,
      order: index
    }));

    // 更新现有的分组排序，保留其他分组的排序
    const updatedGroupOrders = [...originalGroupOrders];
    newGroupOrders.forEach(({ groupName, order }) => {
      const existingIndex = updatedGroupOrders.findIndex(g => g.groupName === groupName);
      if (existingIndex >= 0) {
        updatedGroupOrders[existingIndex].order = order;
      } else {
        updatedGroupOrders.push({ groupName, order });
      }
    });

    setUserGroupOrders(updatedGroupOrders);
    toast.success('分组排序已更新');

    try {
      // 2. 延迟验证 - 发送API请求
      const response = await authenticatedFetch('/api/admin/model-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupOrders: newGroupOrders
        }),
      });

      if (!response.ok) {
        // 3. 如果API失败，回滚到原始状态
        setUserGroupOrders(originalGroupOrders);

        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        toast.error(`分组排序更新失败: ${errorMessage}`);

        console.error('Group order update failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          requestData: {
            userId: currentUser.id,
            groupOrders: newGroupOrders
          }
        });
      } else {
        // 4. 延迟验证成功，重新加载数据确保一致性
        setTimeout(() => {
          loadGroupOrders();
        }, 1000);
      }
    } catch (error) {
      // 5. 网络错误或其他异常，回滚状态
      setUserGroupOrders(originalGroupOrders);
      toast.error('网络错误，分组排序更新失败');
      console.error('Group order update error:', error);
    }
  };

  // 处理分组内模型排序
  const handleGroupModelReorder = (providerId: string, groupId: string, reorderedModels: any[]) => {
    // 更新提供商的模型顺序
    updateModelOrder(providerId, reorderedModels);
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

      const response = await authenticatedFetch('/api/fetch-models', {
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

        // 1. 立即显示预期模型 (乐观更新)
        const newModels = models.map((modelId: string, index: number) => ({
          id: `temp_${Date.now()}_${index}`, // 临时ID
          modelId: modelId,
          name: modelId,
          isEnabled: true,
          order: 999 + index, // 临时排序
          description: null,
          group: null,
          maxTokens: null,
          temperature: null,
          topP: null,
          frequencyPenalty: null,
          presencePenalty: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          providerId: provider.id,
          provider: provider,
          _isTemporary: true, // 标记为临时模型
        }));

        // 立即添加到UI中 (灰色显示)
        setProviders(prev => prev.map(p =>
          p.id === provider.id
            ? { ...p, models: [...(p.models || []), ...newModels] }
            : p
        ));

        toast.success(`开始导入 ${models.length} 个模型...`);

        // 2. 批量创建模型 - 使用单个API调用
        const batchResponse = await authenticatedFetch('/api/admin/models/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
          } else {
            toast.error('所有模型导入失败');
          }

          // 3. 延迟验证 (3秒后)
          setTimeout(async () => {
            try {
              // 重新加载提供商数据验证
              const verifyResponse = await authenticatedFetch(`/api/admin/providers/${provider.id}`);
              if (verifyResponse.ok) {
                const updatedProvider = await verifyResponse.json();
                const serverModels = updatedProvider.models || [];

                // 4. 更新UI，移除临时模型，显示真实模型
                setProviders(prev => prev.map(p =>
                  p.id === provider.id
                    ? { ...p, models: serverModels }
                    : p
                ));

                // 检查是否有失败的模型
                const failedModels = models.filter(modelId =>
                  !serverModels.some((m: any) => m.modelId === modelId)
                );

                if (failedModels.length > 0) {
                  toast.warning(`${failedModels.length} 个模型导入失败: ${failedModels.slice(0, 3).join(', ')}${failedModels.length > 3 ? '...' : ''}`);
                }
              }
            } catch {
              // 验证失败，重新加载所有数据
              loadProvidersAndModels();
              toast.warning('无法验证导入结果，已重新加载数据');
            }
          }, 3000);

          // 如果有错误，显示详细信息
          if (errors && errors.length > 0) {
            console.warn('模型导入错误:', errors);
          }
        } else {
          // API调用失败，移除临时模型
          setProviders(prev => prev.map(p =>
            p.id === provider.id
              ? { ...p, models: (p.models || []).filter(m => !m._isTemporary) }
              : p
          ));
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
      const response = await authenticatedFetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

  // 切换模型状态 - 乐观更新 + 延迟验证
  const toggleModelStatus = async (modelId: string, isEnabled: boolean) => {
    if (!currentUser) return;

    // 保存原始状态
    let originalModel: any = null;
    let originalProviderIndex = -1;
    let originalModelIndex = -1;

    // 找到原始模型
    for (let i = 0; i < providers.length; i++) {
      const modelIndex = providers[i].models?.findIndex(m => m.id === modelId) ?? -1;
      if (modelIndex !== -1) {
        originalModel = providers[i].models![modelIndex];
        originalProviderIndex = i;
        originalModelIndex = modelIndex;
        break;
      }
    }

    if (!originalModel) return;

    // 1. 立即更新UI (乐观更新)
    setProviders(prev => prev.map((provider, pIndex) => {
      if (pIndex === originalProviderIndex) {
        return {
          ...provider,
          models: provider.models?.map((model, mIndex) =>
            mIndex === originalModelIndex
              ? { ...model, isEnabled: !isEnabled }
              : model
          )
        };
      }
      return provider;
    }));

    // 显示即时反馈
    toast.success(isEnabled ? '模型已禁用' : '模型已启用');

    // 2. 发送API请求
    try {
      const response = await authenticatedFetch(`/api/admin/models/${modelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: !isEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      // 3. 延迟验证 (1.5秒后)
      setTimeout(async () => {
        try {
          const verifyResponse = await authenticatedFetch(`/api/admin/models/${modelId}`);
          if (verifyResponse.ok) {
            const model = await verifyResponse.json();

            // 4. 验证状态是否正确
            if (model.isEnabled !== !isEnabled) {
              // 回滚状态
              setProviders(prev => prev.map((provider, pIndex) => {
                if (pIndex === originalProviderIndex) {
                  return {
                    ...provider,
                    models: provider.models?.map((m, mIndex) =>
                      mIndex === originalModelIndex
                        ? { ...m, isEnabled: originalModel.isEnabled }
                        : m
                    )
                  };
                }
                return provider;
              }));
              toast.error('模型状态更新失败，已恢复原状态');
            }
          }
        } catch {
          // 验证失败，回滚
          setProviders(prev => prev.map((provider, pIndex) => {
            if (pIndex === originalProviderIndex) {
              return {
                ...provider,
                models: provider.models?.map((m, mIndex) =>
                  mIndex === originalModelIndex
                    ? { ...m, isEnabled: originalModel.isEnabled }
                    : m
                )
              };
            }
            return provider;
          }));
          toast.error('无法验证模型状态更新，已恢复原状态');
        }
      }, 1500);

    } catch (error) {
      // API调用失败，立即回滚
      setProviders(prev => prev.map((provider, pIndex) => {
        if (pIndex === originalProviderIndex) {
          return {
            ...provider,
            models: provider.models?.map((m, mIndex) =>
              mIndex === originalModelIndex
                ? { ...m, isEnabled: originalModel.isEnabled }
                : m
            )
          };
        }
        return provider;
      }));
      toast.error('操作失败，已恢复原状态');
    }
  };

  // 编辑模型
  const editModel = (model: any) => {
    // 打开编辑模型对话框
    setEditingModel(model);
    setShowEditModelModal(true);
  };

  // 更新编辑后的模型
  const updateEditedModel = async (data: { id: string; name: string; group?: string }) => {
    if (!currentUser) return;

    // 保存原始模型数据
    let originalModel: any = null;
    let originalProviderIndex = -1;
    let originalModelIndex = -1;

    // 找到原始模型
    for (let i = 0; i < providers.length; i++) {
      const modelIndex = providers[i].models?.findIndex((m: any) => m.id === data.id) ?? -1;
      if (modelIndex !== -1) {
        originalModel = providers[i].models![modelIndex];
        originalProviderIndex = i;
        originalModelIndex = modelIndex;
        break;
      }
    }

    if (!originalModel) {
      toast.error('找不到要编辑的模型');
      return;
    }

    // 乐观更新UI
    setProviders(prev => prev.map((provider, pIndex) => {
      if (pIndex === originalProviderIndex) {
        return {
          ...provider,
          models: provider.models?.map((model: any, mIndex: number) =>
            mIndex === originalModelIndex
              ? { 
                  ...model, 
                  name: data.name, 
                  group: data.group
                }
              : model
          )
        };
      }
      return provider;
    }));

    // 关闭对话框
    setShowEditModelModal(false);
    setEditingModel(null);
    toast.success('模型更新成功');

    try {
      // 发送API请求
      const response = await authenticatedFetch(`/api/admin/models/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          group: data.group
        }),
      });

      if (!response.ok) {
        // 如果API失败，回滚UI
        setProviders(prev => prev.map((provider, pIndex) => {
          if (pIndex === originalProviderIndex) {
            return {
              ...provider,
              models: provider.models?.map((m: any, mIndex: number) =>
                mIndex === originalModelIndex ? originalModel : m
              )
            };
          }
          return provider;
        }));

        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        toast.error(`模型更新失败: ${errorMessage}`);
      } else {
        // 成功后重新加载数据确保一致性
        setTimeout(() => {
          loadProvidersAndModels();
        }, 1000);
      }
    } catch (error) {
      // API调用失败，回滚UI
      setProviders(prev => prev.map((provider, pIndex) => {
        if (pIndex === originalProviderIndex) {
          return {
            ...provider,
            models: provider.models?.map((m: any, mIndex: number) =>
              mIndex === originalModelIndex ? originalModel : m
            )
          };
        }
        return provider;
      }));
      toast.error('网络错误，模型更新失败');
    }
  };

  // 删除模型
  const deleteModel = async (modelId: string, modelName: string) => {
    if (!currentUser) return;

    if (!confirm(`确定要删除模型 "${modelName}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/admin/models/${modelId}`, {
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
      const response = await authenticatedFetch('/api/admin/models/auto-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: providerId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || `已为 ${provider.models.length} 个模型自动分组`);
        loadProvidersAndModels();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '自动分组失败';
        toast.error(errorMessage);
      }
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
      const response = await authenticatedFetch('/api/admin/models/auto-group', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelIds: groupData.modelIds,
          groupName: groupData.groupName,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || `成功为 ${groupData.modelIds.length} 个模型设置分组"${groupData.groupName}"`);
        loadProvidersAndModels();
        setShowCustomGroupModal(false);
        setSelectedProviderId('');
        setSelectedModelsForGroup([]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '创建自定义分组失败';
        toast.error(errorMessage);
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
      const response = await authenticatedFetch('/api/chat', {
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

      // 保存原始模型名称
      const originalNames = new Map<string, string>();
      modelsToRename.forEach((model: any) => {
        originalNames.set(model.id, model.name);
      });

      // 1. 立即更新UI显示新名称 (乐观更新)
      setProviders(prev => prev.map(provider => ({
        ...provider,
        models: provider.models?.map(model => {
          const newName = renameMap.get(model.modelId);
          if (newName && modelsToRename.some((m: any) => m.id === model.id)) {
            return { ...model, name: newName };
          }
          return model;
        })
      })));

      toast.success(`AI重命名完成，正在保存...`);

      // 2. 批量更新模型名称
      const updatePromises = modelsToRename.map((model: any) => {
        const newName = renameMap.get(model.modelId);
        if (newName) {
          return authenticatedFetch(`/api/admin/models/${model.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newName,
            }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const responses = await Promise.all(updatePromises);
      const successCount = responses.filter(r => r.ok).length;
      const failCount = responses.length - successCount;

      // 3. 延迟验证 (2秒后)
      setTimeout(async () => {
        try {
          // 验证每个模型的名称是否正确更新
          const verifyPromises = modelsToRename.map((model: any) =>
            authenticatedFetch(`/api/admin/models/${model.id}`)
          );

          const verifyResponses = await Promise.all(verifyPromises);
          const verifyResults = await Promise.all(
            verifyResponses.map(r => r.ok ? r.json() : null)
          );

          // 检查哪些模型名称更新失败
          const failedModels: any[] = [];
          verifyResults.forEach((result, index) => {
            if (result) {
              const model = modelsToRename[index];
              const expectedName = renameMap.get(model.modelId);
              if (expectedName && result.name !== expectedName) {
                failedModels.push(model);
              }
            }
          });

          // 回滚失败的模型名称
          if (failedModels.length > 0) {
            setProviders(prev => prev.map(provider => ({
              ...provider,
              models: provider.models?.map(model => {
                if (failedModels.some(fm => fm.id === model.id)) {
                  const originalName = originalNames.get(model.id);
                  return originalName ? { ...model, name: originalName } : model;
                }
                return model;
              })
            })));

            toast.warning(`${failedModels.length} 个模型重命名失败，已恢复原名称`);
          }

        } catch {
          // 验证失败，重新加载数据
          loadProvidersAndModels();
          toast.warning('无法验证重命名结果，已重新加载数据');
        }
      }, 2000);

      if (successCount > 0) {
        toast.success(`AI成功重命名 ${successCount} 个模型${failCount > 0 ? `，${failCount} 个失败` : ''}`);
        setShowAIRenameModal(false);
        setSelectedProviderId('');
      } else {
        // 全部失败，回滚所有名称
        setProviders(prev => prev.map(provider => ({
          ...provider,
          models: provider.models?.map(model => {
            const originalName = originalNames.get(model.id);
            return originalName ? { ...model, name: originalName } : model;
          })
        })));
        toast.error('AI重命名失败，已恢复原名称');
      }

    } catch (error) {
      console.error('AI rename error:', error);
      toast.error('AI重命名失败');
    }
  };

  // 更新模型排序 - 乐观更新 + 延迟验证
  const updateModelOrder = async (providerId: string, reorderedModels: any[]) => {
    if (!currentUser) return;

    // 保存原始模型顺序
    const originalProvider = providers.find(p => p.id === providerId);
    const originalModels = originalProvider?.models || [];

    // 1. 立即更新UI (保留拖拽动画效果)
    setProviders(prevProviders =>
      prevProviders.map(provider =>
        provider.id === providerId
          ? { ...provider, models: reorderedModels }
          : provider
      )
    );

    // 显示即时反馈
    toast.success('模型排序已更新');

    // 2. 发送API请求
    try {
      const response = await authenticatedFetch('/api/admin/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models: reorderedModels.map((model, index) => ({
            id: model.id,
            order: index
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      // 3. 延迟验证 (2秒后)
      setTimeout(async () => {
        try {
          const verifyResponse = await authenticatedFetch(`/api/admin/models?providerId=${providerId}`);
          if (verifyResponse.ok) {
            const serverModels = await verifyResponse.json();

            // 4. 验证排序是否正确
            const isOrderCorrect = reorderedModels.every((model, index) => {
              const serverModel = serverModels.find((m: any) => m.id === model.id);
              return serverModel && serverModel.order === index;
            });

            if (!isOrderCorrect) {
              // 回滚排序
              setProviders(prevProviders =>
                prevProviders.map(provider =>
                  provider.id === providerId
                    ? { ...provider, models: originalModels }
                    : provider
                )
              );
              toast.error('排序更新失败，已恢复原顺序');
            }
          }
        } catch {
          // 验证失败，回滚
          setProviders(prevProviders =>
            prevProviders.map(provider =>
              provider.id === providerId
                ? { ...provider, models: originalModels }
                : provider
            )
          );
          toast.error('无法验证排序更新，已恢复原顺序');
        }
      }, 2000);

    } catch (error) {
      // API调用失败，立即回滚
      setProviders(prevProviders =>
        prevProviders.map(provider =>
          provider.id === providerId
            ? { ...provider, models: originalModels }
            : provider
        )
      );
      toast.error('排序更新失败，已恢复原顺序');
    }
  };

  // 用户管理函数 - 乐观更新 + 延迟验证
  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    if (!currentUser) return;

    // 保存原始用户状态
    const originalUser = users.find(u => u.id === userId);
    if (!originalUser) return;

    // 1. 立即更新UI (乐观更新)
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, isActive: !isActive }
        : user
    ));

    // 显示即时反馈
    toast.success(isActive ? '用户已禁用' : '用户已启用');

    // 2. 发送API请求
    try {
      const response = await authenticatedFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      // 3. 延迟验证 (1.5秒后)
      setTimeout(async () => {
        try {
          const verifyResponse = await authenticatedFetch(`/api/admin/users/${userId}`);
          if (verifyResponse.ok) {
            const user = await verifyResponse.json();

            // 4. 验证状态是否正确
            if (user.isActive !== !isActive) {
              // 回滚状态
              setUsers(prev => prev.map(u =>
                u.id === userId
                  ? { ...u, isActive: originalUser.isActive }
                  : u
              ));
              toast.error('用户状态更新失败，已恢复原状态');
            }
          }
        } catch {
          // 验证失败，回滚
          setUsers(prev => prev.map(u =>
            u.id === userId
              ? { ...u, isActive: originalUser.isActive }
              : u
          ));
          toast.error('无法验证用户状态更新，已恢复原状态');
        }
      }, 1500);

    } catch (error) {
      // API调用失败，立即回滚
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, isActive: originalUser.isActive }
          : u
      ));
      toast.error('操作失败，已恢复原状态');
    }
  };

  // 打开删除用户确认对话框
  const openDeleteUserDialog = (userId: string, username: string) => {
    setDeletingUser({ id: userId, username });
    setShowDeleteUserDialog(true);
  };

  // 关闭删除用户确认对话框
  const closeDeleteUserDialog = () => {
    setShowDeleteUserDialog(false);
    setDeletingUser(null);
  };

  // 删除用户函数
  const deleteUser = async (userId: string, username: string) => {
    if (!currentUser) return;

    // 保存原始用户数据
    const originalUser = users.find(u => u.id === userId);
    if (!originalUser) return;

    // 1. 立即从UI移除
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast.success('用户删除成功');
    closeDeleteUserDialog();

    // 2. 发送API请求
    try {
      const response = await authenticatedFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        // 如果API请求失败，恢复用户
        setUsers(prev => [...prev, originalUser].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
        
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '删除用户失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      // API调用失败，立即恢复
      setUsers(prev => [...prev, originalUser].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      toast.error('删除操作失败');
    }
  };

  // 邀请码管理函数
  const createInviteCode = async (count: number = 1, maxUses: number = 1) => {
    if (!currentUser) return;

    try {
      const promises = [];
      for (let i = 0; i < count; i++) {
        promises.push(
          authenticatedFetch('/api/admin/codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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

  // 打开删除邀请码对话框
  const openDeleteInviteDialog = (codeId: string, code: string) => {
    setDeletingInvite({ id: codeId, code });
    setShowDeleteInviteDialog(true);
  };

  const deleteInviteCode = async (codeId: string, code: string) => {
    if (!currentUser) return;

    try {
      const response = await authenticatedFetch(`/api/admin/codes/${codeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('邀请码删除成功');
        loadInviteCodes();
        setShowDeleteInviteDialog(false);
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
      const response = await authenticatedFetch('/api/admin/system-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

  // 添加加载token统计数据的函数
  const loadTokenStats = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      // 加载用户排行榜
      const leaderboardResponse = await authenticatedFetch('/api/admin/stats?type=users');
      
      // 加载模型统计
      const modelStatsResponse = await authenticatedFetch('/api/admin/stats?type=models');
      
      if (leaderboardResponse.ok && modelStatsResponse.ok) {
        const userLeaderboard = await leaderboardResponse.json();
        const modelStats = await modelStatsResponse.json();
        
        // 计算总token数量
        const totalTokens = userLeaderboard.reduce(
          (sum: number, user: any) => sum + (user.totalTokens || 0), 
          0
        );
        
        setTokenUsageStats({
          totalTokens,
          userLeaderboard,
          modelStats
        });
      } else {
        toast.error('加载Token统计数据失败');
      }
    } catch (error) {
      console.error('Error loading token stats:', error);
      toast.error('加载Token统计数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    if (activeTab === 'dashboard') {
      loadDashboard();
      loadProvidersAndModels(); // 为了获取提供商和模型数量
      loadTokenStats(); // 加载Token使用统计
    } else if (activeTab === 'users') {
      loadUsers();
      loadTokenStats(); // 加载用户Token统计
    } else if (activeTab === 'invites') {
      loadInviteCodes();
    } else if (activeTab === 'system') {
      loadSystemSettings();
    } else if (activeTab === 'models') {
      loadProvidersAndModels();
      loadGroupOrders(); // 加载分组排序配置
    } else if (activeTab === 'tokens') {
      // Token统计页面会自己加载数据
    }
  }, [activeTab, currentUser]);

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="inherit" sx={{ color: '#000000' }} variant="body1">您没有管理员权限</Typography>
                  <Link href="/chat" style={{ color: '#000000', textDecoration: 'underline' }}>
          返回聊天
        </Link>
      </Box>
    );
  }

  // 添加删除用户确认对话框
  const DeleteUserDialog = () => {
    return (
      <Dialog
        open={showDeleteUserDialog}
        onClose={closeDeleteUserDialog}
        aria-labelledby="delete-user-dialog-title"
      >
        <DialogTitle id="delete-user-dialog-title">
          确认删除用户
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            您确定要删除用户 <b>{deletingUser?.username}</b> 吗？此操作不可撤销，将删除该用户的所有数据。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteUserDialog} color="primary">
            取消
          </Button>
          <Button 
            onClick={() => deletingUser && deleteUser(deletingUser.id, deletingUser.username)} 
            color="error"
            variant="contained"
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // 添加删除邀请码确认对话框
  const DeleteInviteDialog = () => {
    return (
      <Dialog
        open={showDeleteInviteDialog}
        onClose={() => setShowDeleteInviteDialog(false)}
        aria-labelledby="delete-invite-dialog-title"
      >
        <DialogTitle id="delete-invite-dialog-title">
          确认删除邀请码
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            您确定要删除邀请码 <b>{deletingInvite?.code}</b> 吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteInviteDialog(false)} color="primary">
            取消
          </Button>
          <Button 
            onClick={() => deletingInvite && deleteInviteCode(deletingInvite.id, deletingInvite.code)} 
            color="error"
            variant="contained"
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // 生成随机密码
  const generatePassword = (length = 12) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars[randomIndex];
    }

    return password;
  };

  // 创建用户
  const createUser = async () => {
    if (!currentUser || !createUserData.username) return;
    
    try {
      // 如果没有密码，生成一个随机密码
      const password = createUserData.password || generatePassword(12);
      
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: createUserData.username,
          email: createUserData.email || undefined, // 如果为空字符串，则传undefined
          password: password,
          role: 'USER'
        }),
      });

      if (response.ok) {
        toast.success(`用户创建成功，密码: ${password}`);
        // 先关闭模态框
        setShowCreateUserModal(false);
        // 延迟一点再重置数据，避免可能的渲染冲突
        setTimeout(() => {
          setCreateUserData({
            username: '',
            email: '',
            password: '',
            isGeneratingPassword: false
          });
          // 重新加载用户列表
          loadUsers();
        }, 100);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '创建用户失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('创建用户失败');
    }
  };

  // 重置用户密码
  const resetUserPassword = async () => {
    if (!currentUser || !resetPasswordData.userId || !resetPasswordData.newPassword) return;

    setIsResettingPassword(true);
    try {
      const response = await authenticatedFetch(`/api/admin/users/${resetPasswordData.userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: resetPasswordData.newPassword
        }),
      });

      if (response.ok) {
        toast.success(`用户 "${resetPasswordData.username}" 的密码已重置`);
        setShowResetPasswordModal(false);
        setResetPasswordData({ userId: '', username: '', newPassword: '' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '密码重置失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('密码重置失败');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // 打开重置密码对话框
  const openResetPasswordModal = (userId: string, username: string) => {
    setResetPasswordData({ userId, username, newPassword: '' });
    setShowResetPasswordModal(true);
  };

  // 重置密码对话框
  interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    username: string;
    newPassword: string;
    setNewPassword: (password: string) => void;
    isLoading: boolean;
  }

  function ResetPasswordModal({ 
    isOpen, 
    onClose, 
    onSubmit, 
    username, 
    newPassword, 
    setNewPassword,
    isLoading 
  }: ResetPasswordModalProps) {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit();
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" onClick={onClose}>
            <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
          </div>

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;

          <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    重置用户密码
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      您正在为用户 <span className="font-bold">{username}</span> 重置密码。
                    </p>
                    <form onSubmit={handleSubmit}>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          新密码
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="输入新密码"
                          minLength={6}
                          required
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          密码长度至少需要6个字符
                        </p>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={onSubmit}
                disabled={isLoading || !newPassword || newPassword.length < 6}
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                  (isLoading || !newPassword || newPassword.length < 6) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? '处理中...' : '重置密码'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 创建用户对话框
  interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    formData: {
      username: string;
      email: string;
      password: string;
      isGeneratingPassword: boolean;
    };
    setFormData: (data: any) => void;
  }

  function CreateUserModal({ 
    isOpen, 
    onClose, 
    onSubmit, 
    formData, 
    setFormData 
  }: CreateUserModalProps) {
    
    // 添加控制台日志帮助调试
    console.log("CreateUserModal rendering with isOpen:", isOpen, "formData:", formData);
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit();
    };

    const handleGeneratePassword = () => {
      setFormData({...formData, password: generatePassword(12)});
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-[99999] overflow-y-auto" style={{ zIndex: 99999 }}>
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" onClick={onClose}>
            <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
          </div>

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;

          <div 
            className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    创建新用户
                  </h3>
                  <div className="mt-2 z-[99999]">
                    <form onSubmit={handleSubmit}>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          用户名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => {
                            // 使用函数形式的setState确保获取最新状态
                            setFormData(prevState => ({
                              ...prevState,
                              username: e.target.value
                            }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                          placeholder="输入用户名"
                          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          电子邮箱（可选）
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData(prevState => ({
                              ...prevState,
                              email: e.target.value
                            }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}
                          placeholder="输入邮箱（可选）"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            密码
                          </label>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGeneratePassword();
                            }}
                            className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 pointer-events-auto"
                            style={{ pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}
                          >
                            生成随机密码
                          </button>
                        </div>
                        <input
                          type="text"
                          value={formData.password}
                          onChange={(e) => {
                            setFormData(prevState => ({
                              ...prevState,
                              password: e.target.value
                            }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}
                          placeholder="留空将自动生成12位强密码"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          如不填写，系统将自动生成12位强密码
                        </p>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={onSubmit}
                disabled={!formData.username}
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                  !formData.username ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                创建用户
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container>
        {/* 删除用户确认对话框 */}
        <DeleteUserDialog />
        
        {/* 删除邀请码确认对话框 */}
        <DeleteInviteDialog />
        
        {/* 页面标题 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}>
            管理员配置
          </Typography>
          <Typography variant="body1" color="text.secondary">
            管理系统用户、邀请码和模型配置
          </Typography>
        </Box>

        {/* 导航标签 */}
        <Box sx={{ mb: 3 }}>
          <Paper sx={{ borderRadius: 1 }}>
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="仪表板" value="dashboard" />
              <Tab label="用户管理" value="users" />
              <Tab label="邀请码管理" value="invites" />
              <Tab label="模型管理" value="models" />
              <Tab label="Token统计" value="tokens" />
              <Tab label="系统设置" value="system" />
            </Tabs>
          </Paper>
        </Box>

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

            {/* AI 高级设置 */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                AI 高级设置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    标题生成模型
                  </label>
                  <select
                    value={systemSettings.title_generation_model_id || ''}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, title_generation_model_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">选择用于生成对话标题的模型</option>
                    {providers.flatMap(provider =>
                      provider.models?.filter(model => model.isEnabled).map(model => (
                        <option key={model.id} value={model.id}>
                          {provider.displayName || provider.name} - {model.name}
                        </option>
                      )) || []
                    )}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    选择用于自动生成对话标题的AI模型。如果不选择，将使用用户当前选择的模型。
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    系统默认模型
                  </label>
                  <select
                    value={systemSettings.system_default_model_id || ''}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, system_default_model_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">选择系统默认模型</option>
                    {providers.flatMap(provider =>
                      provider.models?.filter(model => model.isEnabled).map(model => (
                        <option key={model.id} value={model.id}>
                          {provider.displayName || provider.name} - {model.name}
                        </option>
                      )) || []
                    )}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    选择系统默认模型，新用户首次访问或未设置默认模型的用户将使用此模型。
                  </p>
                </div>
              </div>

              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="enable_last_used_model"
                  checked={systemSettings.enable_last_used_model ?? true}
                  onChange={(e) => setSystemSettings(prev => ({ ...prev, enable_last_used_model: e.target.checked }))}
                  className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                />
                <label htmlFor="enable_last_used_model" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  自动记住上次使用的模型作为默认选择
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => updateSystemSettings(systemSettings)}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                >
                  保存AI设置
                </button>
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
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
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
                                          ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                          : 'bg-gray-300 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                      }`}>
                                        {provider.isEnabled ? '启用' : '禁用'}
                                      </span>
                                    </div>
                                                                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {provider.name}
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
                                        ? 'bg-gray-300 text-gray-800 hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    {provider.isEnabled ? '禁用' : '启用'}
                                  </button>
                                  <button
                                    onClick={() => setEditingProvider(provider)}
                                    className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                  >
                                    编辑
                                  </button>
                                  <button
                                    onClick={() => deleteProvider(provider.id, provider.displayName)}
                                    className="px-3 py-1 text-xs bg-gray-300 text-gray-800 rounded hover:bg-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
                                      className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {isLoading ? '获取中...' : 'v1/models 获取'}
                                    </button>
                                    <button
                                      onClick={() => openAddModelModal(provider.id)}
                                      className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                      自定义模型
                                    </button>
                                    <button
                                      onClick={() => autoGroupModels(provider.id)}
                                      className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                      🤖 自动分组
                                    </button>
                                    <button
                                      onClick={() => openCustomGroupModal(provider.id)}
                                      className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                      📁 自定义分组
                                    </button>
                                    <button
                                      onClick={() => openAIRenameModal(provider.id)}
                                      className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                      ✨ AI 起名
                                    </button>
                                  </div>
                                </div>



                                {/* 模型列表 */}
                                <div className="space-y-2">
                                  {provider.models && provider.models.length > 0 ? (
                                    (() => {
                                      // 使用用户自定义分组排序对模型进行分组
                                      const groupsWithOrder = getModelGroupsWithUserOrder(provider.models, userGroupOrders);

                                      // 转换为SortableModelGroupList需要的格式
                                      const groups = groupsWithOrder.map((group) => ({
                                        id: `${provider.id}-${group.groupName}`,
                                        name: group.groupName,
                                        models: group.models,
                                        expanded: expandedGroups.has(`${provider.id}-${group.groupName}`),
                                        order: group.order
                                      }));

                                      return (
                                        <SortableModelGroupList
                                          groups={groups}
                                          onGroupReorder={(reorderedGroups) => handleGroupReorder(provider.id, reorderedGroups)}
                                          onGroupToggle={(groupId) => toggleGroupExpanded(groupId)}
                                          onModelReorder={(groupId, reorderedModels) => handleGroupModelReorder(provider.id, groupId, reorderedModels)}
                                          renderModel={(model: any) => (
                                            <div className={`flex items-center justify-between p-3 rounded border ${
                                              model._isTemporary
                                                ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-500 opacity-70'
                                                : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                                            }`}>
                                              <div className="flex-1">
                                                <div className={`text-sm font-medium ${
                                                  model._isTemporary
                                                    ? 'text-gray-600 dark:text-gray-400'
                                                    : 'text-gray-900 dark:text-white'
                                                }`}>
                                                  {model.name}
                                                  {model._isTemporary && (
                                                    <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                                                      (导入中...)
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                  ID: {model.modelId}
                                                  {model.group && (
                                                    <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                                                      分组: {model.group}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                {!model._isTemporary && (
                                                  <>
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
                                                  </>
                                                )}
                                                {model._isTemporary && (
                                                  <div className="flex items-center space-x-1">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                                                    <span className="text-xs text-orange-600 dark:text-orange-400">导入中</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        />
                                      );
                                    })()
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
          <div>
            {/* 系统状态概览 */}
            <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                系统状态概览
              </Typography>

              <Grid container spacing={3}>
                {/* 用户统计卡片 */}
                <Grid item xs={12} md={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'primary.50',
                      borderRadius: 2,
                      height: '100%'
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      用户统计
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        总用户数:
                      </Typography>
                      <Typography variant="h4" color="primary" sx={{ my: 0.5 }}>
                        {stats?.totalUsers || 0}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          活跃用户:
                        </Typography>
                        <Typography variant="body1">
                          {stats?.activeUsers || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          管理员:
                        </Typography>
                        <Typography variant="body1">
                          {stats?.detailed?.userCount?.admin || 0}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* 模型统计卡片 */}
                <Grid item xs={12} md={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'info.50',
                      borderRadius: 2,
                      height: '100%'
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      模型统计
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        总模型数:
                      </Typography>
                      <Typography variant="h4" color="info.main" sx={{ my: 0.5 }}>
                        {stats?.detailed?.modelUsage?.totalModels || models.length || 0}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          启用模型:
                        </Typography>
                        <Typography variant="body1">
                          {stats?.detailed?.modelUsage?.activeModels || models.filter(m => m.isEnabled).length || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          提供商:
                        </Typography>
                        <Typography variant="body1">
                          {stats?.detailed?.modelUsage?.totalProviders || providers.length || 0}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* 系统代码统计卡片 */}
                <Grid item xs={12} md={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: 'success.50',
                      borderRadius: 2,
                      height: '100%'
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      系统代码统计
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        邀请码总数:
                      </Typography>
                      <Typography variant="h4" color="success.main" sx={{ my: 0.5 }}>
                        {stats?.totalInviteCodes || 0}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          使用邀请码:
                        </Typography>
                        <Typography variant="body1">
                          {stats?.usedInviteCodes || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          访问码:
                        </Typography>
                        <Typography variant="body1">
                          {stats?.totalAccessCodes || 0}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
            
            {/* Token 使用统计 */}
            <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Token 使用统计
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1">
                  系统总计: {tokenUsageStats.totalTokens.toLocaleString()} tokens
                </Typography>
              </Box>

              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                按用户统计 (Top 10)
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>用户</TableCell>
                      <TableCell>角色</TableCell>
                      <TableCell align="right">Token 数量</TableCell>
                      <TableCell align="right">消息数</TableCell>
                      <TableCell align="right">成本 (USD)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tokenUsageStats.userLeaderboard.slice(0, 10).map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Chip 
                            label={user.role} 
                            size="small"
                            color={user.role === 'ADMIN' ? 'error' : user.role === 'USER' ? 'primary' : 'default'} 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">{user.totalTokens.toLocaleString()}</TableCell>
                        <TableCell align="right">{user.messageCount}</TableCell>
                        <TableCell align="right">${user.totalCost.toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                    {tokenUsageStats.userLeaderboard.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">暂无数据</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  按模型统计 (Top 10)
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>模型</TableCell>
                        <TableCell>提供商</TableCell>
                        <TableCell align="right">Token 数量</TableCell>
                        <TableCell align="right">用户数</TableCell>
                        <TableCell align="right">成本 (USD)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tokenUsageStats.modelStats.slice(0, 10).map((model) => (
                        <TableRow key={model.modelId}>
                          <TableCell>{model.modelName}</TableCell>
                          <TableCell>{model.providerName}</TableCell>
                          <TableCell align="right">{model.totalTokens.toLocaleString()}</TableCell>
                          <TableCell align="right">{model.userCount}</TableCell>
                          <TableCell align="right">${model.totalCost.toFixed(4)}</TableCell>
                        </TableRow>
                      ))}
                      {tokenUsageStats.modelStats.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">暂无数据</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Paper>
            
            {/* 其他仪表板组件 */}
          </div>
        )}

        {/* 用户管理 */}
                  {activeTab === 'users' && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="h2">
                用户管理
              </Typography>
              <Box>
                <Button 
                  variant="contained" 
                  color="primary" 
                  sx={{ mr: 1 }}
                  onClick={() => {
                    // 先重置状态，再打开模态框
                    setCreateUserData({
                      username: '',
                      email: '',
                      password: '',
                      isGeneratingPassword: false
                    });
                    setShowCreateUserModal(true);
                  }}
                >
                  创建用户
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'right' }}>
                  共 {users.length} 个用户
                </Typography>
              </Box>
            </Box>

            {/* 用户列表 */}
            <Paper sx={{ borderRadius: 1, overflow: 'hidden' }}>
              {isLoading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ display: 'inline-block', animation: 'spin 1s linear infinite', mb: 1 }}>
                    ⏳
                  </Box>
                  <Typography color="text.secondary">加载中...</Typography>
                </Box>
              ) : users.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">暂无用户数据</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>用户信息</TableCell>
                        <TableCell>角色</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell>Token 使用</TableCell>
                        <TableCell>操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {user.username}
                              </Typography>
                              {user.email && (
                                <Typography variant="body2" color="text.secondary">
                                  {user.email}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.role}
                              color={user.role === 'ADMIN' ? 'secondary' : 'primary'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.isActive ? '活跃' : '禁用'}
                              color={user.isActive ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {user.tokenUsage ? (
                              <Box>
                                <Typography variant="body2">{user.tokenUsage.totalTokens.toLocaleString()} tokens</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ¥{user.tokenUsage.cost.toFixed(2)}
                                </Typography>
                              </Box>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {user.role !== 'ADMIN' && (
                                <>
                                  <Button
                                    variant="text"
                                    size="small"
                                    color="inherit"
                                    sx={{ color: '#000000' }}
                                    onClick={() => toggleUserStatus(user.id, user.isActive)}
                                  >
                                    {user.isActive ? '禁用' : '启用'}
                                  </Button>
                                  <Button
                                    variant="text"
                                    size="small"
                                    color="inherit"
                                    sx={{ color: '#000000' }}
                                    onClick={() => openResetPasswordModal(user.id, user.username)}
                                  >
                                    重置密码
                                  </Button>
                                  <Button
                                    variant="text"
                                    size="small"
                                    color="error"
                                    onClick={() => openDeleteUserDialog(user.id, user.username)}
                                  >
                                    删除
                                  </Button>
                                </>
                              )}
                              {user.role === 'ADMIN' && (
                                <>
                                  <Button
                                    variant="text"
                                    size="small"
                                    color="inherit"
                                    sx={{ color: '#000000' }}
                                    onClick={() => openResetPasswordModal(user.id, user.username)}
                                  >
                                    重置密码
                                  </Button>
                                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1, alignSelf: 'center' }}>
                                    (管理员)
                                  </Typography>
                                </>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>
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
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
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
                                  ? 'bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                  : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
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
                                                                                onClick={() => openDeleteInviteDialog(code.id, code.code)}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
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
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
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
                    className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
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
                    className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
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
                <div className="flex items-center">
                  <label className="block text-sm text-gray-700 dark:text-gray-300">
                    Token 相关设置已移至 "Token 统计与价格设置" 页面
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
                    className="h-4 w-4 text-black focus:ring-gray-500 border-gray-300 rounded"
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

        {/* Token 统计页面 */}
        {activeTab === 'tokens' && (
          <Box sx={{ p: 3 }}>
            <TokenStatsAdmin />
          </Box>
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

        {/* 重置密码对话框 */}
        <ResetPasswordModal
          isOpen={showResetPasswordModal}
          onClose={() => setShowResetPasswordModal(false)}
          onSubmit={resetUserPassword}
          username={resetPasswordData.username}
          newPassword={resetPasswordData.newPassword}
          setNewPassword={(newPassword) => setResetPasswordData({...resetPasswordData, newPassword})}
          isLoading={isResettingPassword}
        />
        <EditModelModal
          isOpen={showEditModelModal}
          onClose={() => {
            setShowEditModelModal(false);
            setEditingModel(null);
          }}
          onSubmit={updateEditedModel}
          model={editingModel}
          groupOptions={userGroupOrders.map(g => g.groupName)}
        />
        <CreateUserModal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          onSubmit={createUser}
          formData={createUserData}
          setFormData={setCreateUserData}
        />
      </Container>
    </Box>
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
    <div className="fixed inset-0 z-[99999] overflow-y-auto" style={{ zIndex: 99999 }}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
        
        <div 
          className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full relative p-6"
          onClick={(e) => e.stopPropagation()}
        >
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
                onChange={(e) => setFormData(prevState => ({ ...prevState, name: e.target.value }))}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
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
                    setFormData(prevState => ({ ...prevState, icon: value }));
                    setShowCustomEmoji(value === 'custom');
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none pointer-events-auto"
                  style={{ pointerEvents: 'auto' }}
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
                    onClick={(e) => e.stopPropagation()}
                    placeholder="输入一个 emoji，如：🚀"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                    style={{ pointerEvents: 'auto' }}
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
                onChange={(e) => setFormData(prevState => ({ ...prevState, baseUrl: e.target.value }))}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
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
                onChange={(e) => setFormData(prevState => ({ ...prevState, apiKey: e.target.value }))}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
                placeholder="sk-..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prevState => ({ ...prevState, description: e.target.value }))}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
                rows={3}
                placeholder="提供商描述..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isEnabled"
                checked={formData.isEnabled}
                onChange={(e) => setFormData(prevState => ({ ...prevState, isEnabled: e.target.checked }))}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
              />
              <label htmlFor="isEnabled" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                启用提供商
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {initialData ? '更新' : '创建'}
              </button>
            </div>
          </form>
        </div>
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
    <div className="fixed inset-0 z-[99999] overflow-y-auto" style={{ zIndex: 99999 }}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
        
        <div 
          className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative p-6"
          onClick={(e) => e.stopPropagation()}
        >
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
                onChange={(e) => setFormData(prevState => ({ ...prevState, count: parseInt(e.target.value) || 1 }))}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
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
                onChange={(e) => setFormData(prevState => ({ ...prevState, maxUses: parseInt(e.target.value) || 1 }))}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                创建邀请码
              </button>
            </div>
          </form>
        </div>
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
    <div className="fixed inset-0 z-[99999] overflow-y-auto" style={{ zIndex: 99999 }}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative p-6"
            onClick={(e) => e.stopPropagation()}>
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
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}
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
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}
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
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}
                rows={3}
                placeholder="模型描述..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                添加模型
              </button>
            </div>
          </form>
        </div>
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
    setFormData(prevState => ({
      ...prevState,
      modelIds: prevState.modelIds.includes(modelId)
        ? prevState.modelIds.filter(id => id !== modelId)
        : [...prevState.modelIds, modelId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto" style={{ zIndex: 99999 }}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
        
        <div 
          className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative p-6 max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
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
                onChange={(e) => setFormData(prevState => ({ ...prevState, groupName: e.target.value }))}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
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
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded pointer-events-auto"
                      style={{ pointerEvents: 'auto' }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                disabled={!formData.groupName.trim() || formData.modelIds.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                创建分组
              </button>
            </div>
          </form>
        </div>
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
    setFormData(prevState => ({
      ...prevState,
      selectedModels: prevState.selectedModels.includes(modelId)
        ? prevState.selectedModels.filter(id => id !== modelId)
        : [...prevState.selectedModels, modelId]
    }));
  };

  const selectAll = () => {
    setFormData(prevState => ({
      ...prevState,
      selectedModels: models.map((m: any) => m.id)
    }));
  };

  const deselectAll = () => {
    setFormData(prevState => ({
      ...prevState,
      selectedModels: []
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto" style={{ zIndex: 99999 }}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
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
                onChange={(e) => setFormData(prevState => ({ ...prevState, aiModelId: e.target.value }))}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      selectAll();
                    }}
                    className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    全选
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deselectAll();
                    }}
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
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded pointer-events-auto"
                      style={{ pointerEvents: 'auto' }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                disabled={!formData.aiModelId || formData.selectedModels.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                🤖 开始AI重命名
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

  // 重置用户密码
  const resetUserPassword = async () => {
    if (!currentUser || !resetPasswordData.userId || !resetPasswordData.newPassword) return;

    setIsResettingPassword(true);
    try {
      const response = await authenticatedFetch(`/api/admin/users/${resetPasswordData.userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: resetPasswordData.newPassword
        }),
      });

      if (response.ok) {
        toast.success(`用户 "${resetPasswordData.username}" 的密码已重置`);
        setShowResetPasswordModal(false);
        setResetPasswordData({ userId: '', username: '', newPassword: '' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || '密码重置失败';
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error('密码重置失败');
    } finally {
      setIsResettingPassword(false);
    }
  };

// 打开重置密码对话框
const openResetPasswordModal = (userId: string, username: string) => {
  setResetPasswordData({ userId, username, newPassword: '' });
  setShowResetPasswordModal(true);
};

// 重置密码对话框
interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  username: string;
  newPassword: string;
  setNewPassword: (password: string) => void;
  isLoading: boolean;
}

function ResetPasswordModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  username, 
  newPassword, 
  setNewPassword,
  isLoading 
}: ResetPasswordModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  重置用户密码
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    您正在为用户 <span className="font-bold">{username}</span> 重置密码。
                  </p>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        新密码
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="输入新密码"
                        minLength={6}
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        密码长度至少需要6个字符
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isLoading || !newPassword || newPassword.length < 6}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                (isLoading || !newPassword || newPassword.length < 6) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? '处理中...' : '重置密码'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 编辑模型对话框组件
interface EditModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { id: string, name: string, group?: string }) => void;
  model: any;
  groupOptions: string[];
}

function EditModelModal({ isOpen, onClose, onSubmit, model, groupOptions = [] }: EditModelModalProps) {
  const { error: toastError } = useToast();
  const [formData, setFormData] = useState({
    id: '',
    modelId: '',
    name: '',
    group: '',
  });

  // 初始化表单数据
  useEffect(() => {
    if (model) {
      setFormData({
        id: model.id || '',
        modelId: model.modelId || '',
        name: model.name || '',
        group: model.group || '',
      });
    }
  }, [model]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toastError('请填写模型名称');
      return;
    }

    onSubmit({
      id: formData.id,
      name: formData.name.trim(),
      group: formData.group || undefined,
    });
  };

  if (!isOpen || !model) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          编辑模型
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              模型ID
            </label>
            <input
              type="text"
              value={formData.modelId}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              模型ID不可修改
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
              placeholder="例如: GPT-4o"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              显示在界面上的模型名称
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              模型分组
            </label>
            <div className="relative">
              <select
                value={formData.group || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none"
              >
                <option value="">-- 无分组 --</option>
                {groupOptions.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              模型将在分组中按顺序显示
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
              保存更改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
