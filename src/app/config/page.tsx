'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast, ToastContainer } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { Dropdown } from '@/components/Dropdown';
import { AIRenameModal } from '@/components/AIRenameModal';
import { ModelSelectorModal } from '@/components/ModelSelectorModal';
import { BatchRenameModal } from '@/components/BatchRenameModal';
import { AIIcon } from '@/components/AIIcon';
import { GroupManagerModal } from '@/components/GroupManagerModal';
import { sortCategoriesByOrder, getAIModelCategoryName, sortModelsByOrder, sortByOrder } from '@/utils/aiModelUtils';
import { SortableModelList } from '@/components/SortableModelList';
import { SortableList } from '@/components/SortableList';
import { SortableGroupList } from '@/components/SortableGroupList';

interface AIModel {
  id: string;
  name: string;
  modelId: string;
  enabled: boolean;
  isCustom: boolean; // 是否为用户自定义模型
  customGroup?: string; // 自定义分组名称
  order?: number; // 排序顺序
}

interface CustomGroup {
  id: string;
  name: string;
  providerId: string;
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

interface ConfigData {
  providers: AIProvider[];
  defaultProviderId: string;
  defaultModelId: string;
  customGroups: CustomGroup[];
  customCategoryOrder?: Record<string, string[]>; // 自定义分组排序
}

export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigData>({
    providers: [
      {
        id: 'openai',
        name: 'OpenAI',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        enabled: true,
        models: [
          { id: '1', name: 'GPT-4o Mini', modelId: 'gpt-4o-mini', enabled: true, isCustom: false }
        ]
      }
    ],
    defaultProviderId: 'openai',
    defaultModelId: '1',
    customGroups: [],
    customCategoryOrder: {}
  });
  const [saved, setSaved] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [editingProviderId, setEditingProviderId] = useState<string>('');
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [loadingModels, setLoadingModels] = useState<string>('');
  const [aiRenameModel, setAiRenameModel] = useState<{ model: AIModel; providerId: string } | null>(null);
  const [collapsedProviders, setCollapsedProviders] = useState<Set<string>>(new Set(['openai'])); // 默认折叠
  const [showModelSelector, setShowModelSelector] = useState<{ providerId: string; models: string[] } | null>(null);
  const [batchRenameProvider, setBatchRenameProvider] = useState<AIProvider | null>(null);
  const [groupByCategory, setGroupByCategory] = useState<boolean>(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showGroupManager, setShowGroupManager] = useState<string>(''); // 显示分组管理的providerId
  const [newGroupName, setNewGroupName] = useState('');
  const [customCategoryOrder, setCustomCategoryOrder] = useState<Record<string, string[]>>({});

  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  // 从localStorage加载配置
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
            defaultModelId: defaultModels.find(m => m.modelId === parsed.model)?.id || '1',
            customGroups: [],
            customCategoryOrder: {}
          };
          setConfig(migratedConfig);
        } else {
          setConfig(parsed);
          // 从配置中读取自定义分组排序
          if (parsed.customCategoryOrder) {
            setCustomCategoryOrder(parsed.customCategoryOrder);
          }
        }
      } catch {
        // 使用console.error而不是toast，避免依赖循环
        console.error('配置加载失败，使用默认配置');
      }
    }
  }, []);

  // 当启用分组显示时，设置所有分组默认折叠
  useEffect(() => {
    if (groupByCategory && config) {
      const allCategories = new Set<string>();
      config.providers.forEach(provider => {
        const groupedModels = getModelGroups(provider.models);
        Object.keys(groupedModels).forEach(categoryName => {
          allCategories.add(categoryName);
        });
      });

      setCollapsedCategories(prev => {
        const newSet = new Set(prev);
        allCategories.forEach(categoryName => {
          newSet.add(categoryName); // 默认折叠所有分组
        });
        return newSet;
      });
    }
  }, [groupByCategory, config]);

  // 保存配置
  const handleSave = () => {
    const configToSave = {
      ...config,
      customCategoryOrder
    };
    localStorage.setItem('fimai-config', JSON.stringify(configToSave));
    setSaved(true);
    toast.success('配置已保存');
    setTimeout(() => setSaved(false), 2000);
  };

  // 添加AI服务提供商
  const handleAddProvider = () => {
    const newProvider: AIProvider = {
      id: Date.now().toString(),
      name: '',
      apiKey: '',
      baseUrl: '',
      enabled: true,
      models: []
    };
    setEditingProvider(newProvider);
    setIsAddingProvider(true);
  };

  // 编辑AI服务提供商
  const handleEditProvider = (provider: AIProvider) => {
    setEditingProvider({ ...provider });
    setIsAddingProvider(false);
  };

  // 保存AI服务提供商
  const handleSaveProvider = () => {
    if (!editingProvider) return;

    if (!editingProvider.name.trim()) {
      toast.error('请输入提供商名称');
      return;
    }

    if (!editingProvider.apiKey.trim()) {
      toast.error('请输入API Key');
      return;
    }

    if (!editingProvider.baseUrl.trim()) {
      toast.error('请输入Base URL');
      return;
    }

    if (isAddingProvider) {
      setConfig(prev => ({
        ...prev,
        providers: [...prev.providers, editingProvider]
      }));
      toast.success('提供商添加成功');
    } else {
      setConfig(prev => ({
        ...prev,
        providers: prev.providers.map(p =>
          p.id === editingProvider.id ? editingProvider : p
        )
      }));
      toast.success('提供商更新成功');
    }

    setEditingProvider(null);
    setIsAddingProvider(false);
  };

  // 删除AI服务提供商
  const handleDeleteProvider = async (providerId: string) => {
    if (config.providers.length <= 1) {
      toast.error('至少需要保留一个AI服务提供商');
      return;
    }

    const confirmed = await confirm(
      '删除提供商',
      '确定要删除这个AI服务提供商吗？其下的所有模型配置也会被删除。',
      { type: 'danger', confirmText: '删除' }
    );

    if (confirmed) {
      setConfig(prev => {
        const newProviders = prev.providers.filter(p => p.id !== providerId);
        return {
          ...prev,
          providers: newProviders,
          defaultProviderId: prev.defaultProviderId === providerId ? newProviders[0]?.id || '' : prev.defaultProviderId,
          defaultModelId: prev.defaultProviderId === providerId ? newProviders[0]?.models[0]?.id || '' : prev.defaultModelId
        };
      });
      toast.success('提供商删除成功');
    }
  };

  // 测试API连接
  const handleTestProvider = async (provider: AIProvider) => {
    if (!provider.apiKey) {
      toast.error('请先输入API Key');
      return;
    }

    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openaiApiKey: provider.apiKey,
          openaiBaseUrl: provider.baseUrl,
          model: 'gpt-3.5-turbo'
        }),
      });

      if (response.ok) {
        toast.success('API连接测试成功！');
      } else {
        toast.error('API连接测试失败，请检查配置');
      }
    } catch (error) {
      toast.error('连接测试失败：' + error);
    }
  };

  // 添加模型
  const handleAddModel = (providerId: string) => {
    const newModel: AIModel = {
      id: Date.now().toString(),
      name: '',
      modelId: '',
      enabled: true,
      isCustom: true
    };
    setEditingModel(newModel);
    setEditingProviderId(providerId);
    setIsAddingModel(true);
  };

  // 编辑模型
  const handleEditModel = (model: AIModel, providerId: string) => {
    setEditingModel({ ...model });
    setEditingProviderId(providerId);
    setIsAddingModel(false);
  };

  // 保存模型
  const handleSaveModel = () => {
    if (!editingModel || !editingProviderId) return;

    if (!editingModel.name.trim()) {
      toast.error('请输入模型名称');
      return;
    }

    if (!editingModel.modelId.trim()) {
      toast.error('请输入Model ID');
      return;
    }

    setConfig(prev => ({
      ...prev,
      providers: prev.providers.map(provider => {
        if (provider.id === editingProviderId) {
          if (isAddingModel) {
            return {
              ...provider,
              models: [...provider.models, editingModel]
            };
          } else {
            return {
              ...provider,
              models: provider.models.map(m =>
                m.id === editingModel.id ? editingModel : m
              )
            };
          }
        }
        return provider;
      })
    }));

    toast.success(isAddingModel ? '模型添加成功' : '模型更新成功');
    setEditingModel(null);
    setEditingProviderId('');
    setIsAddingModel(false);
  };

  // 删除模型
  const handleDeleteModel = async (modelId: string, providerId: string) => {
    const confirmed = await confirm(
      '删除模型',
      '确定要删除这个模型配置吗？',
      { type: 'danger', confirmText: '删除' }
    );

    if (confirmed) {
      setConfig(prev => ({
        ...prev,
        providers: prev.providers.map(provider => {
          if (provider.id === providerId) {
            const newModels = provider.models.filter(m => m.id !== modelId);
            return {
              ...provider,
              models: newModels
            };
          }
          return provider;
        }),
        defaultModelId: prev.defaultModelId === modelId ? '' : prev.defaultModelId
      }));
      toast.success('模型删除成功');
    }
  };



  // 获取可用的模型列表
  const handleFetchModels = async (provider: AIProvider) => {
    if (!provider.apiKey) {
      toast.error('请先输入API Key');
      return;
    }

    setLoadingModels(provider.id);
    try {
      const response = await fetch('/api/fetch-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // 过滤掉已存在的模型
        const existingModelIds = provider.models.map(m => m.modelId);
        const availableModels = data.models.filter((modelId: string) => !existingModelIds.includes(modelId));

        if (availableModels.length === 0) {
          toast.info('没有新的模型可以导入');
        } else {
          setShowModelSelector({ providerId: provider.id, models: availableModels });
        }
      } else {
        toast.error('获取模型列表失败');
      }
    } catch (error) {
      toast.error('获取模型列表失败：' + error);
    } finally {
      setLoadingModels('');
    }
  };

  // AI重命名
  const handleAIRename = (model: AIModel, providerId: string) => {
    setAiRenameModel({ model, providerId });
  };

  // 确认AI重命名
  const handleConfirmAIRename = (newName: string) => {
    if (!aiRenameModel) return;

    setConfig(prev => ({
      ...prev,
      providers: prev.providers.map(provider => {
        if (provider.id === aiRenameModel.providerId) {
          return {
            ...provider,
            models: provider.models.map(m =>
              m.id === aiRenameModel.model.id ? { ...m, name: newName } : m
            )
          };
        }
        return provider;
      })
    }));

    toast.success('模型重命名成功');
    setAiRenameModel(null);
  };

  // 切换提供商折叠状态
  const toggleProviderCollapse = (providerId: string) => {
    setCollapsedProviders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(providerId)) {
        newSet.delete(providerId);
      } else {
        newSet.add(providerId);
      }
      return newSet;
    });
  };

  // 切换分类折叠状态
  const toggleCategoryCollapse = (categoryName: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  // 创建自定义分组
  const handleCreateCustomGroup = (providerId: string) => {
    if (!newGroupName.trim()) {
      toast.error('请输入分组名称');
      return;
    }

    const newGroup: CustomGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      providerId
    };

    setConfig(prev => ({
      ...prev,
      customGroups: [...prev.customGroups, newGroup]
    }));

    setNewGroupName('');
    toast.success('自定义分组创建成功');
  };

  // 删除自定义分组
  const handleDeleteCustomGroup = (groupId: string) => {
    setConfig(prev => ({
      ...prev,
      customGroups: prev.customGroups.filter(g => g.id !== groupId),
      providers: prev.providers.map(provider => ({
        ...provider,
        models: provider.models.map(model =>
          model.customGroup === groupId ? { ...model, customGroup: undefined } : model
        )
      }))
    }));
    toast.success('自定义分组已删除');
  };

  // 移动模型到分组
  const handleMoveModelToGroup = (modelId: string, providerId: string, groupName?: string) => {
    setConfig(prev => ({
      ...prev,
      providers: prev.providers.map(provider =>
        provider.id === providerId
          ? {
              ...provider,
              models: provider.models.map(model =>
                model.id === modelId ? { ...model, customGroup: groupName } : model
              )
            }
          : provider
      )
    }));
    toast.success(`模型已移动到${groupName || '默认分组'}`);
  };

  // 处理模型重新排序
  const handleModelReorder = (providerId: string, reorderedModels: AIModel[]) => {
    setConfig(prev => ({
      ...prev,
      providers: prev.providers.map(provider =>
        provider.id === providerId
          ? { ...provider, models: reorderedModels }
          : provider
      )
    }));
    toast.success('模型顺序已更新');
  };

  // 处理分组内模型重新排序
  const handleGroupModelReorder = (providerId: string, groupName: string, reorderedModels: AIModel[]) => {
    setConfig(prev => ({
      ...prev,
      providers: prev.providers.map(provider => {
        if (provider.id !== providerId) return provider;

        // 创建一个新的模型数组，替换指定分组的模型
        const newModels = [...provider.models];
        const groupModels = reorderedModels;

        // 移除原分组的模型
        const otherModels = newModels.filter(model => {
          const modelGroupName = model.customGroup || getAIModelCategoryName(model.modelId);
          return modelGroupName !== groupName;
        });

        // 合并其他模型和重排序的分组模型
        return { ...provider, models: [...otherModels, ...groupModels] };
      })
    }));
    toast.success('模型顺序已更新');
  };

  // 处理提供商重新排序
  const handleProviderReorder = (reorderedProviders: AIProvider[]) => {
    setConfig(prev => ({
      ...prev,
      providers: reorderedProviders
    }));
    toast.success('提供商顺序已更新');
  };

  // 处理分组排序
  const handleGroupReorder = (providerId: string, reorderedGroups: { id: string; name: string; order?: number }[]) => {
    const groupNames = reorderedGroups.map(g => g.name);
    setCustomCategoryOrder(prev => ({
      ...prev,
      [providerId]: groupNames
    }));
    toast.success('分组顺序已更新');
  };

  // 获取模型的混合分组（自定义分组优先，然后是AI分类）
  const getModelGroups = (models: AIModel[]) => {
    const groups: Record<string, AIModel[]> = {};

    models.forEach(model => {
      const groupName = model.customGroup || getAIModelCategoryName(model.modelId);
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(model);
    });

    // 对每个分组内的模型按order排序
    Object.keys(groups).forEach(groupName => {
      groups[groupName] = sortModelsByOrder(groups[groupName]);
    });

    return groups;
  };

  // 获取排序后的分组列表
  const getSortedCategories = (providerId: string, groupedModels: Record<string, AIModel[]>) => {
    const categories = Object.keys(groupedModels);
    const customOrder = customCategoryOrder[providerId];

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

  // 批量AI重命名
  const handleBatchAIRename = async (providerId: string) => {
    const provider = config.providers.find(p => p.id === providerId);
    if (!provider || provider.models.length === 0) {
      toast.error('该提供商没有可重命名的模型');
      return;
    }

    setBatchRenameProvider(provider);
  };

  // 确认批量重命名
  const handleConfirmBatchRename = (renamedModels: { id: string; newName: string }[]) => {
    if (!batchRenameProvider) return;

    setConfig(prev => ({
      ...prev,
      providers: prev.providers.map(provider => {
        if (provider.id === batchRenameProvider.id) {
          return {
            ...provider,
            models: provider.models.map(model => {
              const renamed = renamedModels.find(r => r.id === model.id);
              return renamed ? { ...model, name: renamed.newName } : model;
            })
          };
        }
        return provider;
      })
    }));

    toast.success(`成功重命名 ${renamedModels.length} 个模型`);
    setBatchRenameProvider(null);
  };

  // 导入选中的模型
  const handleImportModels = (selectedModels: string[]) => {
    if (!showModelSelector) return;

    const newModels: AIModel[] = selectedModels.map((modelId) => ({
      id: Date.now().toString() + Math.random(),
      name: modelId,
      modelId: modelId,
      enabled: true,
      isCustom: false
    }));

    setConfig(prev => ({
      ...prev,
      providers: prev.providers.map(p => {
        if (p.id === showModelSelector.providerId) {
          return {
            ...p,
            models: [...p.models, ...newModels]
          };
        }
        return p;
      })
    }));

    toast.success(`成功导入 ${selectedModels.length} 个模型`);
    setShowModelSelector(null);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* 头部导航 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                配置设置
              </h1>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {saved ? '已保存 ✓' : '保存配置'}
                </button>
                <Link
                  href="/chat"
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  进入聊天
                </Link>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              管理您的AI服务提供商和模型配置
            </p>
          </div>

          {/* 默认模型选择 */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              默认模型设置
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  默认服务提供商
                </label>
                <select
                  value={config.defaultProviderId}
                  onChange={(e) => setConfig({...config, defaultProviderId: e.target.value, defaultModelId: ''})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
                >
                  {config.providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  默认模型
                </label>
                <select
                  value={config.defaultModelId}
                  onChange={(e) => setConfig({...config, defaultModelId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">请选择模型</option>
                  {config.providers.find(p => p.id === config.defaultProviderId)?.models.filter(m => m.enabled).map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.modelId})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* AI服务提供商管理 */}
          <div className="max-w-6xl mx-auto space-y-6">
            {/* 添加提供商按钮 */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI服务提供商管理
              </h2>
              <button
                onClick={handleAddProvider}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                添加提供商
              </button>
            </div>

            {/* 提供商列表 */}
            <SortableList
              items={sortByOrder(config.providers)}
              onReorder={handleProviderReorder}
            >
              {(provider) => (
                <div key={provider.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  {/* 提供商信息 */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          provider.enabled
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {provider.enabled ? '已启用' : '已禁用'}
                        </span>
                        <button
                          onClick={() => handleTestProvider(provider)}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
                        >
                          测试连接
                        </button>
                        <button
                          onClick={() => handleEditProvider(provider)}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteProvider(provider.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                          disabled={config.providers.length <= 1}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Base URL:</span>
                        <p className="text-gray-900 dark:text-white truncate">{provider.baseUrl}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">API Key:</span>
                        <p className="text-gray-900 dark:text-white">
                          {provider.apiKey ? '••••••••' + provider.apiKey.slice(-4) : '未设置'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 模型管理 */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => toggleProviderCollapse(provider.id)}
                        className="flex items-center space-x-2 text-md font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                      >
                        <span>模型管理 ({provider.models.length})</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${collapsedProviders.has(provider.id) ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setGroupByCategory(!groupByCategory)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            groupByCategory
                              ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                          title={groupByCategory ? '取消分组' : '按类别分组'}
                        >
                          {groupByCategory ? '📂 已分组' : '📋 列表'}
                        </button>
                        <button
                          onClick={() => setShowGroupManager(provider.id)}
                          className="px-3 py-1 text-sm bg-orange-100 text-orange-800 rounded hover:bg-orange-200 transition-colors"
                          title="管理自定义分组"
                        >
                          🗂️ 分组管理
                        </button>
                        <button
                          onClick={() => handleBatchAIRename(provider.id)}
                          className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors"
                        >
                          🤖 批量重命名
                        </button>
                        <button
                          onClick={() => handleFetchModels(provider)}
                          disabled={loadingModels === provider.id || !provider.apiKey}
                          className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingModels === provider.id ? '获取中...' : '获取模型列表'}
                        </button>
                        <button
                          onClick={() => handleAddModel(provider.id)}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
                        >
                          添加自定义模型
                        </button>
                      </div>
                    </div>

                    {/* 模型列表 */}
                    {!collapsedProviders.has(provider.id) && (
                      <div className="space-y-4">
                        {provider.models.length === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                            暂无模型配置，请添加模型或获取模型列表
                          </p>
                        ) : groupByCategory ? (
                          // 分组显示（支持自定义分组和拖拽排序）
                          (() => {
                            const groupedModels = getModelGroups(provider.models);
                            const sortedCategories = getSortedCategories(provider.id, groupedModels);

                            // 将分组转换为可排序的项目
                            const groupItems = sortedCategories.map((categoryName, index) => ({
                              id: categoryName,
                              name: categoryName,
                              order: index
                            }));

                            return (
                              <SortableGroupList
                                groups={groupItems}
                                onReorder={(reorderedGroups) => handleGroupReorder(provider.id, reorderedGroups)}
                              >
                                {(groupItem) => {
                                  const categoryName = groupItem.name;
                                  return (
                              <div key={categoryName} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                                {/* 分类标题 */}
                                <button
                                  onClick={() => toggleCategoryCollapse(categoryName)}
                                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
                                >
                                  <div className="flex items-center space-x-3">
                                    <AIIcon modelId={groupedModels[categoryName][0].modelId} size={20} />
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {categoryName} ({groupedModels[categoryName].length})
                                    </span>
                                  </div>
                                  <svg
                                    className={`w-4 h-4 transition-transform ${collapsedCategories.has(categoryName) ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>

                                {/* 分类下的模型列表 */}
                                {!collapsedCategories.has(categoryName) && (
                                  <div className="p-3">
                                    <SortableModelList
                                      models={groupedModels[categoryName]}
                                      onReorder={(reorderedModels) => handleGroupModelReorder(provider.id, categoryName, reorderedModels)}
                                    >
                                      {(model) => (
                                      <div key={model.id} className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                        model.enabled
                                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-60'
                                      }`}>
                                        <div className="flex items-center space-x-3">
                                          <div className="relative">
                                            <input
                                              type="checkbox"
                                              checked={model.enabled}
                                              onChange={(e) => {
                                                setConfig(prev => ({
                                                  ...prev,
                                                  providers: prev.providers.map(p =>
                                                    p.id === provider.id
                                                      ? {
                                                          ...p,
                                                          models: p.models.map(m =>
                                                            m.id === model.id ? { ...m, enabled: e.target.checked } : m
                                                          )
                                                        }
                                                      : p
                                                  )
                                                }));
                                              }}
                                              className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                            />
                                            {model.enabled && (
                                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                              </div>
                                            )}
                                          </div>
                                          <AIIcon modelId={model.modelId} size={24} />
                                          <div>
                                            <p className={`font-medium ${model.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                              {model.name}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                              {model.modelId}
                                            </p>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            {model.isCustom && (
                                              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                                                自定义
                                              </span>
                                            )}
                                            {model.enabled ? (
                                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                                                已启用
                                              </span>
                                            ) : (
                                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300 rounded-full">
                                                已禁用
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <Dropdown
                                          trigger={
                                            <button className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors">
                                              ⋯
                                            </button>
                                          }
                                          items={[
                                            {
                                              label: '编辑',
                                              icon: '✏️',
                                              onClick: () => handleEditModel(model, provider.id)
                                            },
                                            {
                                              label: 'AI重命名',
                                              icon: '🤖',
                                              onClick: () => handleAIRename(model, provider.id)
                                            },
                                            {
                                              label: '删除',
                                              icon: '🗑️',
                                              onClick: () => handleDeleteModel(model.id, provider.id),
                                              className: 'text-red-600 dark:text-red-400'
                                            }
                                          ]}
                                        />
                                      </div>
                                      )}
                                    </SortableModelList>
                                  </div>
                                )}
                              </div>
                                  );
                                }}
                              </SortableGroupList>
                            );
                          })()
                        ) : (
                          // 列表显示 - 使用拖拽排序
                          <SortableModelList
                            models={sortModelsByOrder(provider.models)}
                            onReorder={(reorderedModels) => handleModelReorder(provider.id, reorderedModels)}
                          >
                            {(model) => (
                              <div key={model.id} className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                model.enabled
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-60'
                              }`}>
                                <div className="flex items-center space-x-3">
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      checked={model.enabled}
                                      onChange={(e) => {
                                        setConfig(prev => ({
                                          ...prev,
                                          providers: prev.providers.map(p =>
                                            p.id === provider.id
                                              ? {
                                                  ...p,
                                                  models: p.models.map(m =>
                                                    m.id === model.id ? { ...m, enabled: e.target.checked } : m
                                                  )
                                                }
                                              : p
                                          )
                                        }));
                                      }}
                                      className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                    />
                                    {model.enabled && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <AIIcon modelId={model.modelId} size={24} />
                                  <div>
                                    <p className={`font-medium ${model.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                      {model.name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {model.modelId}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {model.isCustom && (
                                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                                        自定义
                                      </span>
                                    )}
                                    {model.enabled ? (
                                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                                        已启用
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300 rounded-full">
                                        已禁用
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Dropdown
                                  trigger={
                                    <button className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors">
                                      ⋯
                                    </button>
                                  }
                                  items={[
                                    {
                                      label: '编辑',
                                      icon: '✏️',
                                      onClick: () => handleEditModel(model, provider.id)
                                    },
                                    {
                                      label: 'AI重命名',
                                      icon: '🤖',
                                      onClick: () => handleAIRename(model, provider.id)
                                    },
                                    {
                                      label: '删除',
                                      icon: '🗑️',
                                      onClick: () => handleDeleteModel(model.id, provider.id),
                                      className: 'text-red-600 dark:text-red-400'
                                    }
                                  ]}
                                />
                              </div>
                            )}
                          </SortableModelList>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </SortableList>
          </div>
        </div>
      </div>

      {/* Toast容器 */}
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      {/* 确认对话框 */}
      <ConfirmDialog />

      {/* 编辑提供商模态框 */}
      {editingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setEditingProvider(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {isAddingProvider ? '添加AI服务提供商' : '编辑AI服务提供商'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    提供商名称 *
                  </label>
                  <input
                    type="text"
                    value={editingProvider.name}
                    onChange={(e) => setEditingProvider({...editingProvider, name: e.target.value})}
                    placeholder="例如: OpenAI"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key *
                  </label>
                  <input
                    type="password"
                    value={editingProvider.apiKey}
                    onChange={(e) => setEditingProvider({...editingProvider, apiKey: e.target.value})}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Base URL *
                  </label>
                  <input
                    type="url"
                    value={editingProvider.baseUrl}
                    onChange={(e) => setEditingProvider({...editingProvider, baseUrl: e.target.value})}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={editingProvider.enabled}
                    onChange={(e) => setEditingProvider({...editingProvider, enabled: e.target.checked})}
                    className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900 dark:text-white">
                    启用此提供商
                  </label>
                </div>
              </div>
              <div className="flex space-x-3 justify-end mt-6">
                <button
                  onClick={() => setEditingProvider(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveProvider}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑模型模态框 */}
      {editingModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setEditingModel(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {isAddingModel ? '添加模型' : '编辑模型'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    模型名称 *
                  </label>
                  <input
                    type="text"
                    value={editingModel.name}
                    onChange={(e) => setEditingModel({...editingModel, name: e.target.value})}
                    placeholder="例如: GPT-4 Turbo"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Model ID *
                  </label>
                  <input
                    type="text"
                    value={editingModel.modelId}
                    onChange={(e) => setEditingModel({...editingModel, modelId: e.target.value})}
                    placeholder="例如: gpt-4-turbo"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enabled-model"
                    checked={editingModel.enabled}
                    onChange={(e) => setEditingModel({...editingModel, enabled: e.target.checked})}
                    className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enabled-model" className="ml-2 block text-sm text-gray-900 dark:text-white">
                    启用此模型
                  </label>
                </div>
              </div>
              <div className="flex space-x-3 justify-end mt-6">
                <button
                  onClick={() => setEditingModel(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveModel}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI重命名模态框 */}
      {aiRenameModel && (
        <AIRenameModal
          isOpen={true}
          model={aiRenameModel.model}
          providers={config.providers}
          onClose={() => setAiRenameModel(null)}
          onRename={handleConfirmAIRename}
        />
      )}

      {/* 模型选择器模态框 */}
      {showModelSelector && (
        <ModelSelectorModal
          isOpen={true}
          models={showModelSelector.models}
          onClose={() => setShowModelSelector(null)}
          onImport={handleImportModels}
        />
      )}

      {/* 批量重命名模态框 */}
      {batchRenameProvider && (
        <BatchRenameModal
          isOpen={true}
          provider={batchRenameProvider}
          providers={config.providers}
          onClose={() => setBatchRenameProvider(null)}
          onRename={handleConfirmBatchRename}
        />
      )}

      {/* 分组管理模态框 */}
      {showGroupManager && (
        <GroupManagerModal
          isOpen={true}
          providerId={showGroupManager}
          models={config.providers.find(p => p.id === showGroupManager)?.models || []}
          customGroups={config.customGroups}
          onClose={() => setShowGroupManager('')}
          onCreateGroup={(name) => {
            setNewGroupName(name);
            handleCreateCustomGroup(showGroupManager);
          }}
          onDeleteGroup={handleDeleteCustomGroup}
          onMoveModel={(modelId, groupName) => handleMoveModelToGroup(modelId, showGroupManager, groupName)}
        />
      )}
    </>
  );
}
