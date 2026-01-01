'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { SystemSettings as SystemSettingsType } from './types';

export default function SystemSettings() {
    const { user: currentUser, authenticatedFetch } = useAuth();
    const { success: toastSuccess, error: toastError } = useToast();
    const toast = { success: toastSuccess, error: toastError };

    const [systemSettings, setSystemSettings] = useState<SystemSettingsType>({});
    const [providers, setProviders] = useState<any[]>([]); // Need providers for AI settings
    const [isLoading, setIsLoading] = useState(false);

    // Load System Settings
    const loadSystemSettings = async () => {
        if (!currentUser) return;
        setIsLoading(true);

        try {
            const response = await authenticatedFetch('/api/admin/system-settings');
            if (response.ok) {
                const data = await response.json();
                setSystemSettings(data);
            } else {
                toast.error('加载系统设置失败');
            }
        } catch (error) {
            toast.error('加载系统设置失败');
        } finally {
            setIsLoading(false);
        }
    };

    // Load Providers (for AI settings dropdowns)
    const loadProviders = async () => {
        if (!currentUser) return;
        try {
            const response = await authenticatedFetch('/api/admin/providers');
            if (response.ok) {
                const data = await response.json();
                setProviders(data);
            }
        } catch (error) {
            console.error('Failed to load providers for settings', error);
        }
    };

    useEffect(() => {
        loadSystemSettings();
        loadProviders();
    }, [currentUser]);

    // Update System Settings
    const updateSystemSettings = async (settings: SystemSettingsType) => {
        if (!currentUser) return;

        try {
            const response = await authenticatedFetch('/api/admin/system-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
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

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                系统设置
            </h2>

            {/* Basic Settings */}
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
                                onChange={(e) => setSystemSettings(prev => ({ ...prev, systemNameSuffix: e.target.value }))}
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
                            onChange={(e) => setSystemSettings(prev => ({ ...prev, systemDescription: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
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

            {/* AI Advanced Settings */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">选择用于生成对话标题的模型</option>
                            {providers.flatMap(provider =>
                                provider.models?.filter((model: any) => model.isEnabled).map((model: any) => (
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">选择系统默认模型</option>
                            {providers.flatMap(provider =>
                                provider.models?.filter((model: any) => model.isEnabled).map((model: any) => (
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
            </div>

            {/* Security Settings */}
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
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

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={() => updateSystemSettings(systemSettings)}
                    className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 transition-colors"
                >
                    保存所有设置
                </button>
            </div>
        </div>
    );
}
