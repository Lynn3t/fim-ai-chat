'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { SortableList } from '@/components/SortableList';
import { SortableModelGroupList } from '../SortableModelGroupList';
import { getModelGroups, getCategorySortOrder, sortGroupsByUserOrder, getModelGroupsWithUserOrder } from '@/utils/aiModelUtils';
import { getProviderIcon } from './utils';
import ProviderModal from './modals/ProviderModal';
import AddModelModal from './modals/AddModelModal';
import EditModelModal from './modals/EditModelModal';
import CustomGroupModal from './modals/CustomGroupModal';
import AIRenameModal from './modals/AIRenameModal';
import { Provider, Model } from './types';

export default function ModelManagement() {
    const { user: currentUser, authenticatedFetch } = useAuth();
    const { success: toastSuccess, error: toastError } = useToast();
    const toast = { success: toastSuccess, error: toastError };

    const [providers, setProviders] = useState<Provider[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Tabs
    const [activeSubTab, setActiveSubTab] = useState<'providers' | 'models'>('providers');

    // UI State
    const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [userGroupOrders, setUserGroupOrders] = useState<Array<{ groupName: string; order: number }>>([]);

    // Modals State
    const [showAddProviderModal, setShowAddProviderModal] = useState(false);
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
    const [showAddModelModal, setShowAddModelModal] = useState(false);
    const [showEditModelModal, setShowEditModelModal] = useState(false);
    const [editingModel, setEditingModel] = useState<Model | null>(null);
    const [selectedProviderId, setSelectedProviderId] = useState<string>('');
    const [showCustomGroupModal, setShowCustomGroupModal] = useState(false);
    const [showAIRenameModal, setShowAIRenameModal] = useState(false);
    const [selectedModelsForGroup, setSelectedModelsForGroup] = useState<string[]>([]);

    // Load Data
    const loadProvidersAndModels = async () => {
        if (!currentUser) return;

        setIsLoading(true);
        try {
            const response = await authenticatedFetch('/api/admin/providers');
            if (response.ok) {
                const data = await response.json();
                setProviders(data || []);

                // Extract all models
                const allModels = data?.flatMap((provider: any) =>
                    provider.models?.map((model: any) => ({
                        ...model,
                        providerName: provider.displayName
                    })) || []
                ) || [];
                setModels(allModels);
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || '加载提供商失败';
                toast.error(errorMessage);
            }
        } catch (error) {
            toast.error('加载提供商失败');
        } finally {
            setIsLoading(false);
        }
    };

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

    useEffect(() => {
        loadProvidersAndModels();
        loadGroupOrders();
    }, [currentUser]);

    // Provider Operations
    const createProvider = async (providerData: any) => {
        if (!currentUser) return;

        try {
            const response = await authenticatedFetch('/api/admin/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(providerData),
            });

            if (response.ok) {
                toast.success('提供商创建成功');
                loadProvidersAndModels();
                setShowAddProviderModal(false);
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || '创建提供商失败');
            }
        } catch (error) {
            toast.error('创建提供商失败');
        }
    };

    const updateProvider = async (providerId: string, providerData: any) => {
        if (!currentUser) return;

        try {
            const response = await authenticatedFetch(`/api/admin/providers/${providerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(providerData),
            });

            if (response.ok) {
                toast.success('提供商更新成功');
                loadProvidersAndModels();
                setEditingProvider(null);
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || '更新提供商失败');
            }
        } catch (error) {
            toast.error('更新提供商失败');
        }
    };

    const deleteProvider = async (providerId: string, providerName: string) => {
        if (!currentUser) return;
        if (!confirm(`确定要删除提供商 "${providerName}" 吗？这将同时删除该提供商下的所有模型。`)) return;

        try {
            const response = await authenticatedFetch(`/api/admin/providers/${providerId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('提供商删除成功');
                loadProvidersAndModels();
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || '删除提供商失败');
            }
        } catch (error) {
            toast.error('删除提供商失败');
        }
    };

    const toggleProviderStatus = async (providerId: string, isEnabled: boolean) => {
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

            // Delayed verification
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
        } catch (error) {
            setProviders(prev => prev.map(p => p.id === providerId ? { ...p, isEnabled: originalProvider.isEnabled } : p));
            toast.error('操作失败，已恢复原状态');
        }
    };

    const updateProviderOrder = async (reorderedProviders: any[]) => {
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
        } catch (error) {
            setProviders(originalProviders);
            toast.error('网络错误，排序更新失败');
        }
    };

    // Model Operations
    const fetchModelsFromAPI = async (provider: any) => {
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

                // Optimistic update logic omitted for brevity, directly calling API to save
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
        } catch (error) {
            toast.error('获取模型列表失败');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleModelStatus = async (modelId: string, isEnabled: boolean) => {
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
                            // Rollback
                            loadProvidersAndModels();
                            toast.error('状态更新失败，已恢复原状态');
                        }
                    }
                } catch {
                    loadProvidersAndModels();
                }
            }, 1500);
        } catch (error) {
            loadProvidersAndModels();
            toast.error('操作失败');
        }
    };

    const updateModelOrder = async (providerId: string, reorderedModels: any[]) => {
        if (!currentUser) return;

        // Optimistic update
        setProviders(prev => prev.map(p =>
            p.id === providerId ? { ...p, models: reorderedModels } : p
        ));

        try {
            const response = await authenticatedFetch(`/api/admin/models/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    providerId,
                    models: reorderedModels.map((m, index) => ({ id: m.id, order: index }))
                }),
            });

            if (!response.ok) {
                loadProvidersAndModels();
                toast.error('更新模型排序失败');
            }
        } catch (error) {
            loadProvidersAndModels();
            toast.error('更新模型排序失败');
        }
    };

    const createCustomModel = async (data: { modelId: string; name: string; description?: string }) => {
        if (!currentUser || !selectedProviderId) return;

        try {
            const response = await authenticatedFetch(`/api/admin/providers/${selectedProviderId}/models`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, isCustom: true, isEnabled: true }),
            });

            if (response.ok) {
                toast.success('自定义模型添加成功');
                loadProvidersAndModels();
                setShowAddModelModal(false);
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || '添加模型失败');
            }
        } catch (error) {
            toast.error('添加模型失败');
        }
    };

    const updateEditedModel = async (data: { id: string, name: string, group?: string }) => {
        if (!currentUser) return;

        try {
            const response = await authenticatedFetch(`/api/admin/models/${data.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                toast.success('模型更新成功');
                loadProvidersAndModels();
                setShowEditModelModal(false);
                setEditingModel(null);
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || '更新模型失败');
            }
        } catch (error) {
            toast.error('更新模型失败');
        }
    };

    const deleteModel = async (modelId: string, modelName: string) => {
        if (!currentUser) return;
        if (!confirm(`确定要删除模型 "${modelName}" 吗？`)) return;

        try {
            const response = await authenticatedFetch(`/api/admin/models/${modelId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('模型删除成功');
                loadProvidersAndModels();
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || '删除模型失败');
            }
        } catch (error) {
            toast.error('删除模型失败');
        }
    };

    // Group Operations
    const handleGroupReorder = async (providerId: string, reorderedGroups: any[]) => {
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
        } catch (error) {
            setUserGroupOrders(originalGroupOrders);
            toast.error('分组排序更新失败');
        }
    };

    const createCustomGroup = async (groupData: { groupName: string; modelIds: string[] }) => {
        if (!currentUser) return;

        try {
            const response = await authenticatedFetch('/api/admin/model-groups/custom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(groupData),
            });

            if (response.ok) {
                toast.success('自定义分组创建成功');
                loadProvidersAndModels();
                setShowCustomGroupModal(false);
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || '创建分组失败');
            }
        } catch (error) {
            toast.error('创建分组失败');
        }
    };

    const performAIRename = async (renameData: { aiModelId: string; selectedModels: string[] }) => {
        if (!currentUser) return;

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
                setShowAIRenameModal(false);
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || 'AI重命名失败');
            }
        } catch (error) {
            toast.error('AI重命名失败');
        }
    };

    const autoGroupModels = async (providerId: string) => {
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
        } catch (error) {
            toast.error('自动分组失败');
        }
    };

    // Helpers
    const toggleProviderExpanded = (providerId: string) => {
        setExpandedProviders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(providerId)) newSet.delete(providerId);
            else newSet.add(providerId);
            return newSet;
        });
    };

    const toggleGroupExpanded = (groupId: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) newSet.delete(groupId);
            else newSet.add(groupId);
            return newSet;
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    模型管理
                </h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowAddProviderModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        添加提供商
                    </button>
                </div>
            </div>

            {/* Sub Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveSubTab('providers')}
                        className={`${activeSubTab === 'providers'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        提供商列表
                    </button>
                    <button
                        onClick={() => setActiveSubTab('models')}
                        className={`${activeSubTab === 'models'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        模型列表
                    </button>
                </nav>
            </div>

            {/* Providers List */}
            {activeSubTab === 'providers' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    {isLoading && providers.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
                            <p className="text-gray-500 mt-2">加载中...</p>
                        </div>
                    ) : providers.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg">暂无提供商</p>
                            <button
                                onClick={() => setShowAddProviderModal(true)}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                添加第一个提供商
                            </button>
                        </div>
                    ) : (
                        <SortableList
                            items={providers}
                            onReorder={updateProviderOrder}
                        >
                            {(provider) => (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 bg-white dark:bg-gray-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                                {getProviderIcon(provider.icon)}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                                    {provider.displayName}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {provider.models?.length || 0} 个模型
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => toggleProviderStatus(provider.id, provider.isEnabled)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${provider.isEnabled
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                {provider.isEnabled ? '已启用' : '已禁用'}
                                            </button>
                                            <button
                                                onClick={() => setEditingProvider(provider)}
                                                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => deleteProvider(provider.id, provider.displayName)}
                                                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => toggleProviderExpanded(provider.id)}
                                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                <svg
                                                    className={`w-5 h-5 transform transition-transform ${expandedProviders.has(provider.id) ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {expandedProviders.has(provider.id) && (
                                        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                            <div className="flex space-x-4 mb-4">
                                                <button
                                                    onClick={() => fetchModelsFromAPI(provider)}
                                                    className="px-3 py-1 text-sm bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400"
                                                >
                                                    🔄 同步模型列表
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProviderId(provider.id);
                                                        setShowAddModelModal(true);
                                                    }}
                                                    className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                                                >
                                                    ➕ 添加自定义模型
                                                </button>
                                                <button
                                                    onClick={() => autoGroupModels(provider.id)}
                                                    className="px-3 py-1 text-sm bg-purple-50 text-purple-600 rounded hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400"
                                                >
                                                    📁 自动分组
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProviderId(provider.id);
                                                        setShowCustomGroupModal(true);
                                                    }}
                                                    className="px-3 py-1 text-sm bg-orange-50 text-orange-600 rounded hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
                                                >
                                                    📂 创建自定义分组
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProviderId(provider.id);
                                                        setShowAIRenameModal(true);
                                                    }}
                                                    className="px-3 py-1 text-sm bg-pink-50 text-pink-600 rounded hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400"
                                                >
                                                    🤖 AI 智能重命名
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </SortableList>
                            )}
                        </div>
                    )}

                    {/* Models List Tab (Flat View) */}
                    {activeSubTab === 'models' && (
                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                            <div className="space-y-4">
                                {models.map((model) => (
                                    <div key={model.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h4 className="text-base font-medium text-gray-900 dark:text-white">{model.name}</h4>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">({model.modelId})</span>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                提供商: {model.providerName || 'Unknown'}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => toggleModelStatus(model.id, model.isEnabled)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${model.isEnabled
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                {model.isEnabled ? '已启用' : '已禁用'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingModel(model);
                                                    setShowEditModelModal(true);
                                                }}
                                                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                            >
                                                编辑
                                            </button>
                                            <button
                                                onClick={() => deleteModel(model.id, model.name)}
                                                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Modals */}
                    <ProviderModal
                        isOpen={showAddProviderModal}
                        onClose={() => setShowAddProviderModal(false)}
                        onSubmit={createProvider}
                        title="添加提供商"
                    />
                    {editingProvider && (
                        <ProviderModal
                            isOpen={!!editingProvider}
                            onClose={() => setEditingProvider(null)}
                            onSubmit={(data) => updateProvider(editingProvider.id, data)}
                            title="编辑提供商"
                            initialData={editingProvider}
                        />
                    )}
                    <AddModelModal
                        isOpen={showAddModelModal}
                        onClose={() => {
                            setShowAddModelModal(false);
                            setSelectedProviderId('');
                        }}
                        onSubmit={createCustomModel}
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
                    <CustomGroupModal
                        isOpen={showCustomGroupModal}
                        onClose={() => {
                            setShowCustomGroupModal(false);
                            setSelectedProviderId('');
                            setSelectedModelsForGroup([]);
                        }}
                        providerId={selectedProviderId}
                        providers={providers}
                        onSubmit={createCustomGroup}
                    />
                    <AIRenameModal
                        isOpen={showAIRenameModal}
                        onClose={() => {
                            setShowAIRenameModal(false);
                            setSelectedProviderId('');
                        }}
                        providerId={selectedProviderId}
                        providers={providers}
                        onSubmit={performAIRename}
                    />
                </div>
            );
}
