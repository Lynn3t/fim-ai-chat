'use client';

import React, { useState } from 'react';
import { SortableList } from '@/components/SortableList';
import { getProviderIcon } from './utils';
import ProviderModal from './modals/ProviderModal';
import AddModelModal from './modals/AddModelModal';
import EditModelModal from './modals/EditModelModal';
import CustomGroupModal from './modals/CustomGroupModal';
import AIRenameModal from './modals/AIRenameModal';
import { Provider, Model } from './types';
import { useModelManagement } from '@/hooks/useModelManagement';

export default function ModelManagement() {
    const {
        providers,
        models,
        isLoading,
        userGroupOrders,
        createProvider,
        updateProvider,
        deleteProvider,
        toggleProviderStatus,
        updateProviderOrder,
        fetchModelsFromAPI,
        toggleModelStatus,
        deleteModel,
        updateModel,
        createCustomModel,
        autoGroupModels,
        createCustomGroup,
        performAIRename,
    } = useModelManagement();

    // Tabs
    const [activeSubTab, setActiveSubTab] = useState<'providers' | 'models'>('providers');

    // UI State
    const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());

    // Modals State
    const [showAddProviderModal, setShowAddProviderModal] = useState(false);
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
    const [showAddModelModal, setShowAddModelModal] = useState(false);
    const [showEditModelModal, setShowEditModelModal] = useState(false);
    const [editingModel, setEditingModel] = useState<Model | null>(null);
    const [selectedProviderId, setSelectedProviderId] = useState<string>('');
    const [showCustomGroupModal, setShowCustomGroupModal] = useState(false);
    const [showAIRenameModal, setShowAIRenameModal] = useState(false);

    // Helpers
    const toggleProviderExpanded = (providerId: string) => {
        setExpandedProviders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(providerId)) newSet.delete(providerId);
            else newSet.add(providerId);
            return newSet;
        });
    };

    // Handler wrappers
    const handleCreateProvider = async (data: Partial<Provider>) => {
        const success = await createProvider(data);
        if (success) setShowAddProviderModal(false);
    };

    const handleUpdateProvider = async (data: Partial<Provider>) => {
        if (!editingProvider) return;
        const success = await updateProvider(editingProvider.id, data);
        if (success) setEditingProvider(null);
    };

    const handleCreateCustomModel = async (data: { modelId: string; name: string; description?: string }) => {
        const success = await createCustomModel(selectedProviderId, data);
        if (success) {
            setShowAddModelModal(false);
            setSelectedProviderId('');
        }
    };

    const handleUpdateModel = async (data: { id: string; name: string; group?: string }) => {
        const success = await updateModel(data);
        if (success) {
            setShowEditModelModal(false);
            setEditingModel(null);
        }
    };

    const handleCreateCustomGroup = async (groupData: { groupName: string; modelIds: string[] }) => {
        const success = await createCustomGroup(groupData);
        if (success) {
            setShowCustomGroupModal(false);
            setSelectedProviderId('');
        }
    };

    const handlePerformAIRename = async (renameData: { aiModelId: string; selectedModels: string[] }) => {
        const success = await performAIRename(renameData);
        if (success) {
            setShowAIRenameModal(false);
            setSelectedProviderId('');
        }
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
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 transition-colors"
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
                            ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        提供商列表
                    </button>
                    <button
                        onClick={() => setActiveSubTab('models')}
                        className={`${activeSubTab === 'models'
                            ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
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
                                className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 transition-colors"
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
                                                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                {provider.isEnabled ? '已启用' : '已禁用'}
                                            </button>
                                            <button
                                                onClick={() => setEditingProvider(provider)}
                                                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => deleteProvider(provider.id, provider.displayName)}
                                                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
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
                                                    className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                                >
                                                    同步模型列表
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProviderId(provider.id);
                                                        setShowAddModelModal(true);
                                                    }}
                                                    className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                                >
                                                    添加自定义模型
                                                </button>
                                                <button
                                                    onClick={() => autoGroupModels(provider.id)}
                                                    className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                                >
                                                    自动分组
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProviderId(provider.id);
                                                        setShowCustomGroupModal(true);
                                                    }}
                                                    className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                                >
                                                    创建自定义分组
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProviderId(provider.id);
                                                        setShowAIRenameModal(true);
                                                    }}
                                                    className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                                >
                                                    AI 智能重命名
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
                                            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
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
                                        className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                    >
                                        编辑
                                    </button>
                                    <button
                                        onClick={() => deleteModel(model.id, model.name)}
                                        className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
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
                onSubmit={handleCreateProvider}
                title="添加提供商"
            />
            {editingProvider && (
                <ProviderModal
                    isOpen={!!editingProvider}
                    onClose={() => setEditingProvider(null)}
                    onSubmit={handleUpdateProvider}
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
                onSubmit={handleCreateCustomModel}
            />
            <EditModelModal
                isOpen={showEditModelModal}
                onClose={() => {
                    setShowEditModelModal(false);
                    setEditingModel(null);
                }}
                onSubmit={handleUpdateModel}
                model={editingModel}
                groupOptions={userGroupOrders.map(g => g.groupName)}
            />
            <CustomGroupModal
                isOpen={showCustomGroupModal}
                onClose={() => {
                    setShowCustomGroupModal(false);
                    setSelectedProviderId('');
                }}
                providerId={selectedProviderId}
                providers={providers}
                onSubmit={handleCreateCustomGroup}
            />
            <AIRenameModal
                isOpen={showAIRenameModal}
                onClose={() => {
                    setShowAIRenameModal(false);
                    setSelectedProviderId('');
                }}
                providerId={selectedProviderId}
                providers={providers}
                onSubmit={handlePerformAIRename}
            />
        </div>
    );
}
