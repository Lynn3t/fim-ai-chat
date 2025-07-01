'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';

interface Provider {
  id: string;
  name: string;
  displayName: string;
  baseUrl?: string;
  apiKey?: string;
  isEnabled: boolean;
  order: number;
  icon?: string;
  description?: string;
  models?: Model[];
}

interface Model {
  id: string;
  modelId: string;
  name: string;
  isEnabled: boolean;
  group?: string;
}

interface ProviderManagerProps {
  adminUserId: string;
}

export default function ProviderManager({ adminUserId }: ProviderManagerProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    baseUrl: '',
    apiKey: '',
    icon: '',
    description: '',
  });
  const toast = useToast();

  // 加载提供商列表
  const loadProviders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/providers?adminUserId=${adminUserId}`);
      if (response.ok) {
        const data = await response.json();
        setProviders(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '加载提供商失败');
      }
    } catch (error) {
      console.error('Load providers error:', error);
      toast.error('网络错误：无法加载提供商');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, [adminUserId]);

  // 处理表单输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      baseUrl: '',
      apiKey: '',
      icon: '',
      description: '',
    });
    setEditingProvider(null);
  };

  // 打开添加模态框
  const handleAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  // 打开编辑模态框
  const handleEdit = (provider: Provider) => {
    setFormData({
      name: provider.name,
      displayName: provider.displayName,
      baseUrl: provider.baseUrl || '',
      apiKey: provider.apiKey || '',
      icon: provider.icon || '',
      description: provider.description || '',
    });
    setEditingProvider(provider);
    setShowAddModal(true);
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.displayName) {
      toast.error('请填写必填字段');
      return;
    }

    setIsLoading(true);
    try {
      const url = editingProvider 
        ? `/api/admin/providers/${editingProvider.id}`
        : '/api/admin/providers';
      
      const method = editingProvider ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId,
          ...formData,
        }),
      });

      if (response.ok) {
        toast.success(editingProvider ? '提供商更新成功' : '提供商创建成功');
        setShowAddModal(false);
        resetForm();
        loadProviders();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '操作失败');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除提供商
  const handleDelete = async (provider: Provider) => {
    if (!confirm(`确定要删除提供商 "${provider.displayName}" 吗？这将同时删除其下的所有模型。`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/providers/${provider.id}?adminUserId=${adminUserId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('提供商删除成功');
        loadProviders();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '删除失败');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  // 切换提供商启用状态
  const toggleProvider = async (provider: Provider) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/providers/${provider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId,
          isEnabled: !provider.isEnabled,
        }),
      });

      if (response.ok) {
        toast.success(`提供商已${!provider.isEnabled ? '启用' : '禁用'}`);
        loadProviders();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '操作失败');
      }
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error('网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          提供商管理
        </h2>
        <button
          onClick={handleAdd}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          添加提供商
        </button>
      </div>

      {/* 提供商列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {isLoading && providers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">加载中...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">暂无提供商</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    提供商
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    API地址
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    模型数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {providers.map((provider) => (
                  <tr key={provider.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {provider.icon && (
                          <img
                            src={provider.icon}
                            alt={provider.displayName}
                            className="h-8 w-8 rounded mr-3"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {provider.displayName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {provider.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {provider.baseUrl || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {provider.models?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        provider.isEnabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {provider.isEnabled ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(provider)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => toggleProvider(provider)}
                        className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                      >
                        {provider.isEnabled ? '禁用' : '启用'}
                      </button>
                      <button
                        onClick={() => handleDelete(provider)}
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

      {/* 添加/编辑模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingProvider ? '编辑提供商' : '添加提供商'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 提供商名称 */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    提供商名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="例如: openai"
                    required
                  />
                </div>

                {/* 显示名称 */}
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    显示名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="例如: OpenAI"
                    required
                  />
                </div>

                {/* API基础URL */}
                <div>
                  <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API基础URL
                  </label>
                  <input
                    type="url"
                    id="baseUrl"
                    name="baseUrl"
                    value={formData.baseUrl}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="例如: https://api.openai.com/v1"
                  />
                </div>

                {/* API密钥 */}
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API密钥
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    name="apiKey"
                    value={formData.apiKey}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="输入API密钥"
                  />
                </div>

                {/* 图标URL */}
                <div>
                  <label htmlFor="icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    图标URL
                  </label>
                  <input
                    type="url"
                    id="icon"
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="图标URL"
                  />
                </div>

                {/* 描述 */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    描述
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="提供商描述"
                  />
                </div>

                {/* 按钮 */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? '保存中...' : (editingProvider ? '更新' : '创建')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
