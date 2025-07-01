'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminConfig from '@/components/AdminConfig';
import UserConfig from '@/components/UserConfig';

function ConfigPageContent() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 左侧标题 */}
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                FimAI Chat - 配置中心
              </h1>
            </div>

            {/* 右侧用户信息和操作 */}
            <div className="flex items-center space-x-4">
              {/* 用户信息 */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.role === 'ADMIN' ? '管理员' : user.role === 'USER' ? '用户' : '访客'}
                  </p>
                </div>
              </div>

              {/* 导航按钮 */}
              <a
                href="/chat"
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                💬 聊天
              </a>

              {/* 退出登录按钮 */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                🚪 退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main>
        {/* 根据用户角色显示不同的配置界面 */}
        {user.role === 'ADMIN' ? (
          <AdminConfig />
        ) : user.role === 'USER' ? (
          <UserConfig />
        ) : (
          // 访客用户重定向到聊天页面
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                访客用户无法访问配置页面
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                访客用户只能使用聊天功能
              </p>
              <a
                href="/chat"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                前往聊天
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ConfigPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ConfigPageContent />
    </ProtectedRoute>
  );
}
