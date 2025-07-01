'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import Link from 'next/link';

interface TokenStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  todayTokens: number;
  todayCost: number;
}

interface AccessCode {
  id: string;
  code: string;
  isActive: boolean;
  maxUses: number;
  currentUses: number;
  allowedModelIds: string[];
  expiresAt?: string;
  createdAt: string;
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

interface Model {
  id: string;
  name: string;
  modelId: string;
  provider: {
    id: string;
    name: string;
  };
}

export default function UserConfig() {
  const { user, chatConfig } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'codes' | 'models'>('dashboard');
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载用户仪表板
  const loadDashboard = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/dashboard?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setTokenStats(data.tokenStats);
        setAccessCodes(data.accessCodes);
        setInviteCodes(data.inviteCodes);
        setAvailableModels(data.allowedModels);
      } else {
        toast.error('加载用户数据失败');
      }
    } catch (error) {
      toast.error('加载用户数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 创建访问码
  const createAccessCode = async (selectedModelIds: string[]) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/user/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: 'access',
          allowedModelIds: selectedModelIds,
          maxUses: 10, // 默认10次使用
        }),
      });

      if (response.ok) {
        toast.success('访问码创建成功');
        loadDashboard();
      } else {
        toast.error('创建访问码失败');
      }
    } catch (error) {
      toast.error('创建访问码失败');
    }
  };

  // 创建邀请码
  const createInviteCode = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/user/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: 'invite',
          maxUses: 1,
        }),
      });

      if (response.ok) {
        toast.success('邀请码创建成功');
        loadDashboard();
      } else {
        toast.error('创建邀请码失败');
      }
    } catch (error) {
      toast.error('创建邀请码失败');
    }
  };

  // 删除访问码
  const deleteAccessCode = async (codeId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/user/codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          codeId,
          type: 'access',
        }),
      });

      if (response.ok) {
        toast.success('访问码已删除');
        loadDashboard();
      } else {
        toast.error('删除访问码失败');
      }
    } catch (error) {
      toast.error('删除访问码失败');
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user]);

  if (!user || user.role === 'GUEST') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">访客用户无法访问配置页面</p>
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
            用户配置
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            管理您的访问码、查看使用统计和模型权限
          </p>
        </div>

        {/* 标签页导航 */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard', name: '仪表板', icon: '📊' },
                { id: 'codes', name: '访问码管理', icon: '🎫' },
                { id: 'models', name: '模型权限', icon: '🤖' },
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
                使用统计
              </h2>
              
              {/* 用户信息 */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
                  账户信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600 dark:text-blue-400">用户名：</span>
                    <span className="text-blue-900 dark:text-blue-100">{user.username}</span>
                  </div>
                  <div>
                    <span className="text-blue-600 dark:text-blue-400">角色：</span>
                    <span className="text-blue-900 dark:text-blue-100">
                      {user.role === 'ADMIN' ? '管理员' : '普通用户'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-600 dark:text-blue-400">注册时间：</span>
                    <span className="text-blue-900 dark:text-blue-100">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Token统计 */}
              {tokenStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-600 dark:text-green-400">
                      总Token使用
                    </h3>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {(tokenStats.totalTokens || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      今日Token
                    </h3>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {(tokenStats.todayTokens || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      总成本
                    </h3>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      ${(tokenStats.totalCost || 0).toFixed(4)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">加载中...</p>
                </div>
              )}

              {/* 快速统计 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    访问码
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    已创建 {accessCodes.length} 个访问码
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    活跃 {accessCodes.filter(c => c.isActive).length} 个
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    邀请码
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    已创建 {inviteCodes.length} 个邀请码
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    可用 {inviteCodes.filter(c => !c.isUsed).length} 个
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'codes' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  访问码管理
                </h2>
                <div className="space-x-2">
                  <button
                    onClick={createInviteCode}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    创建邀请码
                  </button>
                  <button
                    onClick={() => {
                      // 简单示例：选择所有可用模型
                      const allModelIds = availableModels.map(m => m.id);
                      createAccessCode(allModelIds);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    创建访问码
                  </button>
                </div>
              </div>

              {/* 访问码列表 */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  访问码列表
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          访问码
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {accessCodes.map((code) => (
                        <tr key={code.id}>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900 dark:text-white">
                            {code.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {code.currentUses} / {code.maxUses}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              code.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                              {code.isActive ? '活跃' : '禁用'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(code.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => deleteAccessCode(code.id)}
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
              </div>

              {/* 邀请码列表 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  邀请码列表
                </h3>
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
            </div>
          )}

          {activeTab === 'models' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                模型权限
              </h2>
              <div className="space-y-4">
                {availableModels.map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {model.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {model.provider.name} - {model.modelId}
                      </p>
                    </div>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      已授权
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
