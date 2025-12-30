'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { Provider, Model } from '@/components/admin/types';

interface GroupOrder {
  groupName: string;
  order: number;
}

export function useModelManagement() {
  const { user: currentUser, authenticatedFetch } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const toast = { success: toastSuccess, error: toastError };

  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userGroupOrders, setUserGroupOrders] = useState<GroupOrder[]>([]);

  // Load providers and models
  const loadProvidersAndModels = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const response = await authenticatedFetch('/api/admin/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data || []);

        const allModels = data?.flatMap((provider: Provider) =>
          provider.models?.map((model: Model) => ({
            ...model,
            providerName: provider.displayName
          })) || []
        ) || [];
        setModels(allModels);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '加载提供商失败');
      }
    } catch {
      toast.error('加载提供商失败');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, authenticatedFetch, toast]);

  // Load group orders
  const loadGroupOrders = useCallback(async () => {
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
  }, [currentUser, authenticatedFetch]);

  // Provider operations
  const createProvider = useCallback(async (providerData: Partial<Provider>) => {
    if (!currentUser) return false;

    try {
      const response = await authenticatedFetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerData),
      });

      if (response.ok) {
        toast.success('提供商创建成功');
        loadProvidersAndModels();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '创建提供商失败');
        return false;
      }
    } catch {
      toast.error('创建提供商失败');
      return false;
    }
  }, [currentUser, authenticatedFetch, toast, loadProvidersAndModels]);

  const updateProvider = useCallback(async (providerId: string, providerData: Partial<Provider>) => {
    if (!currentUser) return false;

    try {
      const response = await authenticatedFetch(`/api/admin/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerData),
      });

      if (response.ok) {
        toast.success('提供商更新成功');
        loadProvidersAndModels();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '更新提供商失败');
        return false;
      }
    } catch {
      toast.error('更新提供商失败');
      return false;
    }
  }, [currentUser, authenticatedFetch, toast, loadProvidersAndModels]);

  const deleteProvider = useCallback(async (providerId: string, providerName: string) => {
    if (!currentUser) return false;
    if (!confirm(`确定要删除提供商 "${providerName}" 吗？这将同时删除该提供商下的所有模型。`)) return false;

    try {
      const response = await authenticatedFetch(`/api/admin/providers/${providerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('提供商删除成功');
        loadProvidersAndModels();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '删除提供商失败');
        return false;
      }
    } catch {
      toast.error('删除提供商失败');
      return false;
    }
  }, [currentUser, authenticatedFetch, toast, loadProvidersAndModels]);

  const toggleProviderStatus = useCallback(async (providerId: string, isEnabled: boolean) => {
    if (!currentUser) return;
    const originalProvider = providers.find(p => p.id === providerId);
    if (!originalProvider) return;

    // Optimistic update
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, isEnabled: !isEnabled } : p));
    toast.success(isEnabled ? '提供商已禁用' : '提供商已启用');

    try {
      const response = await authenticatedFetch(`/api/admin/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !isEnabled }),
      });

      if (!response.ok) throw new Error('API request failed');

      setTimeout(async () => {
        try {
          const verifyResponse = await authenticatedFetch(`/api/admin/providers/${providerId}`);
          if (verifyResponse.ok) {
            const provider = await verifyResponse.json();
            if (provider.isEnabled !== !isEnabled) {
              setProviders(prev => prev.map(p => p.id === providerId ? { ...p, isEnabled: originalProvider.isEnabled } : p));
              toast.error('状态更新失败，已恢复原状态');
            }
          }
        } catch {
          setProviders(prev => prev.map(p => p.id === providerId ? { ...p, isEnabled: originalProvider.isEnabled } : p));
          toast.error('无法验证状态更新，已恢复原状态');
        }
      }, 1500);
    } catch {
      setProviders(prev => prev.map(p => p.id === providerId ? { ...p, isEnabled: originalProvider.isEnabled } : p));
      toast.error('操作失败，已恢复原状态');
    }
  }, [currentUser, providers, authenticatedFetch, toast]);

  const updateProviderOrder = useCallback(async (reorderedProviders: Provider[]) => {
    if (!currentUser) return;
    const originalProviders = [...providers];
    setProviders(reorderedProviders);
    toast.success('提供商排序已更新');

    try {
      const response = await authenticatedFetch('/api/admin/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          providers: reorderedProviders.map((p, index) => ({ id: p.id, order: index }))
        }),
      });

      if (!response.ok) {
        setProviders(originalProviders);
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '更新排序失败');
      } else {
        setTimeout(() => loadProvidersAndModels(), 2000);
      }
    } catch {
      setProviders(originalProviders);
      toast.error('网络错误，排序更新失败');
    }
  }, [currentUser, providers, authenticatedFetch, toast, loadProvidersAndModels]);

  // Model operations
  const toggleModelStatus = useCallback(async (modelId: string, isEnabled: boolean) => {
    if (!currentUser) return;
    const originalModel = models.find(m => m.id === modelId);
    if (!originalModel) return;

    // Optimistic update
    setModels(prev => prev.map(m => m.id === modelId ? { ...m, isEnabled: !isEnabled } : m));
    setProviders(prev => prev.map(p => ({
      ...p,
      models: p.models?.map(m => m.id === modelId ? { ...m, isEnabled: !isEnabled } : m)
    })));
    toast.success(isEnabled ? '模型已禁用' : '模型已启用');

    try {
      const response = await authenticatedFetch(`/api/admin/models/${modelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !isEnabled }),
      });

      if (!response.ok) throw new Error('API failed');

      setTimeout(async () => {
        try {
          const verifyResponse = await authenticatedFetch(`/api/admin/models/${modelId}`);
          if (verifyResponse.ok) {
            const model = await verifyResponse.json();
            if (model.isEnabled !== !isEnabled) {
              loadProvidersAndModels();
              toast.error('状态更新失败，已恢复原状态');
            }
          }
        } catch {
          loadProvidersAndModels();
        }
      }, 1500);
    } catch {
      loadProvidersAndModels();
      toast.error('操作失败');
    }
  }, [currentUser, models, authenticatedFetch, toast, loadProvidersAndModels]);

  const deleteModel = useCallback(async (modelId: string, modelName: string) => {
    if (!currentUser) return false;
    if (!confirm(`确定要删除模型 "${modelName}" 吗？`)) return false;

    try {
      const response = await authenticatedFetch(`/api/admin/models/${modelId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('模型删除成功');
        loadProvidersAndModels();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '删除模型失败');
        return false;
      }
    } catch {
      toast.error('删除模型失败');
      return false;
    }
  }, [currentUser, authenticatedFetch, toast, loadProvidersAndModels]);

  const updateModel = useCallback(async (data: { id: string; name: string; group?: string }) => {
    if (!currentUser) return false;

    try {
      const response = await authenticatedFetch(`/api/admin/models/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('模型更新成功');
        loadProvidersAndModels();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '更新模型失败');
        return false;
      }
    } catch {
      toast.error('更新模型失败');
      return false;
    }
  }, [currentUser, authenticatedFetch, toast, loadProvidersAndModels]);

  const createCustomModel = useCallback(async (
    providerId: string,
    data: { modelId: string; name: string; description?: string }
  ) => {
    if (!currentUser || !providerId) return false;

    try {
      const response = await authenticatedFetch(`/api/admin/providers/${providerId}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, isCustom: true, isEnabled: true }),
      });

      if (response.ok) {
        toast.success('自定义模型添加成功');
        loadProvidersAndModels();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '添加模型失败');
        return false;
      }
    } catch {
      toast.error('添加模型失败');
      return false;
    }
  }, [currentUser, authenticatedFetch, toast, loadProvidersAndModels]);

  const fetchModelsFromAPI = useCallback(async (provider: Provider) => {
    if (!currentUser) return;
    if (!provider.baseUrl || !provider.apiKey) {
      toast.error('提供商缺少Base URL或API Key，请先配置');
      return;
    }

    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await authenticatedFetch('/api/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: provider.apiKey, baseUrl: provider.baseUrl }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.models?.length === 0) {
          toast.error('未获取到任何模型');
          return;
        }

        const saveResponse = await authenticatedFetch(`/api/admin/providers/${provider.id}/models/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ models: data.models }),
        });

        if (saveResponse.ok) {
          toast.success(`成功获取并保存 ${data.models.length} 个模型`);
          loadProvidersAndModels();
        } else {
          toast.error('保存模型失败');
        }
      } else {
        toast.error('获取模型列表失败');
      }
    } catch {
      toast.error('获取模型列表失败');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, authenticatedFetch, toast, loadProvidersAndModels]);

  const autoGroupModels = useCallback(async (providerId: string) => {
    if (!currentUser) return;

    try {
      toast.success('正在自动分组，请稍候...');
      const response = await authenticatedFetch(`/api/admin/providers/${providerId}/auto-group`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('自动分组成功');
        loadProvidersAndModels();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '自动分组失败');
      }
    } catch {
      toast.error('自动分组失败');
    }
  }, [currentUser, authenticatedFetch, toast, loadProvidersAndModels]);

  // Group operations
  const handleGroupReorder = useCallback(async (providerId: string, reorderedGroups: { name: string }[]) => {
    if (!currentUser) return;
    const originalGroupOrders = [...userGroupOrders];

    const newGroupOrders = reorderedGroups.map((group, index) => ({
      groupName: group.name,
      order: index
    }));

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
      const response = await authenticatedFetch('/api/admin/model-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupOrders: newGroupOrders }),
      });

      if (!response.ok) {
        setUserGroupOrders(originalGroupOrders);
        toast.error('分组排序更新失败');
      } else {
        setTimeout(() => loadGroupOrders(), 1000);
      }
    } catch {
      setUserGroupOrders(originalGroupOrders);
      toast.error('分组排序更新失败');
    }
  }, [currentUser, userGroupOrders, authenticatedFetch, toast, loadGroupOrders]);

  const createCustomGroup = useCallback(async (groupData: { groupName: string; modelIds: string[] }) => {
    if (!currentUser) return false;

    try {
      const response = await authenticatedFetch('/api/admin/model-groups/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      });

      if (response.ok) {
        toast.success('自定义分组创建成功');
        loadProvidersAndModels();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '创建分组失败');
        return false;
      }
    } catch {
      toast.error('创建分组失败');
      return false;
    }
  }, [currentUser, authenticatedFetch, toast, loadProvidersAndModels]);

  const performAIRename = useCallback(async (renameData: { aiModelId: string; selectedModels: string[] }) => {
    if (!currentUser) return false;

    try {
      toast.success('正在进行AI重命名，请稍候...');
      const response = await authenticatedFetch('/api/admin/models/ai-rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renameData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`成功重命名 ${result.renamedCount} 个模型`);
        loadProvidersAndModels();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'AI重命名失败');
        return false;
      }
    } catch {
      toast.error('AI重命名失败');
      return false;
    }
  }, [currentUser, authenticatedFetch, toast, loadProvidersAndModels]);

  // Initial load
  useEffect(() => {
    loadProvidersAndModels();
    loadGroupOrders();
  }, [loadProvidersAndModels, loadGroupOrders]);

  return {
    // State
    providers,
    models,
    isLoading,
    userGroupOrders,

    // Provider operations
    createProvider,
    updateProvider,
    deleteProvider,
    toggleProviderStatus,
    updateProviderOrder,
    fetchModelsFromAPI,

    // Model operations
    toggleModelStatus,
    deleteModel,
    updateModel,
    createCustomModel,
    autoGroupModels,

    // Group operations
    handleGroupReorder,
    createCustomGroup,
    performAIRename,

    // Refresh
    refresh: loadProvidersAndModels,
  };
}
