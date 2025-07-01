'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import Link from 'next/link';

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

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTokens: number;
  totalCost: number;
  todayTokens: number;
  todayCost: number;
}

interface InviteCode {
  id: string;
  code: string;
  isUsed: boolean;
  maxUses: number;
  currentUses: number;
  expiresAt?: string;
  createdAt: string;
}

export default function AdminConfig() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'invites' | 'system'>('dashboard');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetInfo, setResetInfo] = useState<{
    steps: string[];
    confirmationRequired: string;
  } | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);

  // 加载仪表板数据
  const loadDashboard = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/dashboard?adminUserId=${user.id}`);
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
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users?adminUserId=${user.id}`);
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
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/codes?adminUserId=${user.id}&type=invite`);
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

  // 创建邀请码
  const createInviteCode = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: user.id,
          type: 'invite',
          maxUses: 1,
        }),
      });

      if (response.ok) {
        toast.success('邀请码创建成功');
        loadInviteCodes();
      } else {
        toast.error('创建邀请码失败');
      }
    } catch (error) {
      toast.error('创建邀请码失败');
    }
  };

  // 切换用户状态
  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    if (!user) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: user.id,
          userId,
          action: 'updateStatus',
          isActive: !isActive,
        }),
      });

      if (response.ok) {
        toast.success(isActive ? '用户已封禁' : '用户已激活');
        loadUsers();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: 操作失败`;
        console.error('Toggle user status error:', errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误：无法连接到服务器';
      console.error('Toggle user status error:', error);
      toast.error(`操作失败: ${errorMessage}`);
    }
  };

  // 删除用户
  const deleteUser = async (userId: string, username: string) => {
    if (!user) return;

    // 防止删除自己
    if (userId === user.id) {
      toast.error('不能删除自己的账户');
      return;
    }

    if (!confirm(`确定要删除用户 "${username}" 吗？此操作不可撤销！`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: user.id,
          userId,
        }),
      });

      if (response.ok) {
        toast.success(`用户 "${username}" 已删除`);
        loadUsers();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: 删除用户失败`;
        console.error('Delete user error:', errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误：无法连接到服务器';
      console.error('Delete user error:', error);
      toast.error(`删除用户失败: ${errorMessage}`);
    }
  };

  // 获取数据库重置信息
  const loadResetInfo = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/admin/database/reset?adminUserId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setResetInfo({
          steps: data.steps,
          confirmationRequired: data.confirmationRequired,
        });
        setShowResetDialog(true);
      } else {
        toast.error('获取重置信息失败');
      }
    } catch (error) {
      toast.error('获取重置信息失败');
    }
  };

  // 执行数据库重置
  const handleDatabaseReset = async () => {
    if (!user || !resetInfo) return;

    setIsResetting(true);
    try {
      const response = await fetch('/api/admin/database/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: user.id,
          confirmText: resetInfo.confirmationRequired,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('数据库重置成功！页面将在3秒后刷新...');
        setShowResetDialog(false);

        // 3秒后刷新页面
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        toast.error(result.error || '数据库重置失败');
      }
    } catch (error) {
      toast.error('数据库重置失败');
    } finally {
      setIsResetting(false);
    }
  };

  // 加载提供商和模型
  const loadProvidersAndModels = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data);

        // 提取所有模型
        const allModels = data.flatMap((provider: any) =>
          provider.models.map((model: any) => ({
            ...model,
            providerName: provider.name,
            providerId: provider.id,
          }))
        );
        setModels(allModels);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: 加载提供商失败`;
        console.error('Load providers error:', errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误：无法连接到服务器';
      console.error('Load providers error:', error);
      toast.error(`加载提供商失败: ${errorMessage}`);
    }
  };

  // 切换模型状态
  const toggleModelStatus = async (modelId: string, isEnabled: boolean) => {
    if (!user) return;

    try {
      const response = await fetch('/api/admin/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: user.id,
          modelId,
          isEnabled: !isEnabled,
        }),
      });

      if (response.ok) {
        toast.success(isEnabled ? '模型已禁用' : '模型已启用');
        loadProvidersAndModels();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: 操作失败`;
        console.error('Toggle model status error:', errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误：无法连接到服务器';
      console.error('Toggle model status error:', error);
      toast.error(`操作失败: ${errorMessage}`);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboard();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'invites') {
      loadInviteCodes();
    } else if (user && activeTab === 'models') {
      loadProvidersAndModels();
    }
  }, [activeTab, user]);

  if (!user || user.role !== 'ADMIN') {
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
            管理员控制面板
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            管理用户、邀请码和系统设置
          </p>
        </div>

        {/* 标签页导航 */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard', name: '仪表板', icon: '📊' },
                { id: 'users', name: '用户管理', icon: '👥' },
                { id: 'models', name: '模型管理', icon: '🤖' },
                { id: 'invites', name: '邀请码', icon: '🎫' },
                { id: 'system', name: '系统设置', icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 标签页内容 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          {activeTab === 'dashboard' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                系统概览
              </h2>
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      总用户数
                    </h3>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {stats.totalUsers || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-600 dark:text-green-400">
                      活跃用户
                    </h3>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {stats.activeUsers || 0}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      总Token使用
                    </h3>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {(stats.totalTokens || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      今日Token
                    </h3>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                      {(stats.todayTokens || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">加载中...</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                用户管理
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        用户
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
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : user.role === 'USER'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {user.role === 'ADMIN' ? '管理员' : user.role === 'USER' ? '用户' : '访客'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {user.isActive ? '活跃' : '封禁'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => toggleUserStatus(user.id, user.isActive)}
                              className={`${
                                user.isActive
                                  ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                                  : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                              }`}
                            >
                              {user.isActive ? '封禁' : '激活'}
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => deleteUser(user.id, user.username)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  模型管理
                </h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  共 {models.length} 个模型
                </div>
              </div>

              {/* 提供商统计 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    提供商数量
                  </h3>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {providers.length}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-600 dark:text-green-400">
                    启用模型
                  </h3>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {models.filter(m => m.isEnabled).length}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-red-600 dark:text-red-400">
                    禁用模型
                  </h3>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                    {models.filter(m => !m.isEnabled).length}
                  </p>
                </div>
              </div>

              {/* 模型列表 */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                    模型列表
                  </h3>

                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">加载中...</p>
                    </div>
                  ) : models.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">暂无模型数据</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              模型信息
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              提供商
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              分组
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
                          {models.map((model) => (
                            <tr key={model.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {model.name}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {model.modelId}
                                  </div>
                                  {model.description && (
                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                      {model.description}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {model.providerName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {model.group || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  model.isEnabled
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {model.isEnabled ? '启用' : '禁用'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => toggleModelStatus(model.id, model.isEnabled)}
                                  className={`${
                                    model.isEnabled
                                      ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                                      : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                  }`}
                                >
                                  {model.isEnabled ? '禁用' : '启用'}
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

              {/* 注意事项 */}
              <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-600 dark:text-yellow-400 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      注意事项
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <p>禁用模型后，用户将无法使用该模型进行聊天。请谨慎操作，建议在低峰时段进行配置更改。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invites' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  邀请码管理
                </h2>
                <button
                  onClick={createInviteCode}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  创建邀请码
                </button>
              </div>
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
                        创建时间
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {inviteCodes.map((code) => (
                      <tr key={code.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900 dark:text-white">
                          {code.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {code.currentUses} / {code.maxUses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            code.isUsed 
                              ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {code.isUsed ? '已使用' : '可用'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(code.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                系统设置
              </h2>
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
                    管理员邀请码
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mb-2">
                    用于注册第一个管理员账户的特殊邀请码：
                  </p>
                  <code className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-1 rounded font-mono text-sm">
                    fimai_ADMIN_MASTER_KEY
                  </code>
                  <p className="text-blue-600 dark:text-blue-400 text-xs mt-2">
                    此邀请码仅能使用一次，用于创建第一个管理员账户（已使用）
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    快速操作
                  </h3>
                  <div className="space-y-2">
                    <Link
                      href="/chat"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      前往聊天
                    </Link>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
                    ⚠️ 危险操作
                  </h3>
                  <p className="text-red-700 dark:text-red-300 text-sm mb-4">
                    以下操作将永久删除所有数据，请谨慎操作！
                  </p>
                  <button
                    onClick={loadResetInfo}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    🗑️ 重置数据库
                  </button>
                  <p className="text-red-600 dark:text-red-400 text-xs mt-2">
                    此操作将删除所有用户、聊天记录、邀请码等数据
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 数据库重置确认对话框 */}
      <ConfirmDialog
        isOpen={showResetDialog}
        title="⚠️ 重置数据库"
        message="此操作将永久删除所有数据且无法恢复！请确认您了解此操作的后果。"
        confirmText="确认重置"
        cancelText="取消"
        type="danger"
        requireTextConfirmation={resetInfo?.confirmationRequired}
        isLoading={isResetting}
        steps={resetInfo?.steps || []}
        onConfirm={handleDatabaseReset}
        onCancel={() => {
          setShowResetDialog(false);
          setResetInfo(null);
        }}
      />
    </div>
  );
}
