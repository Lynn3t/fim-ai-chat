'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TokenStatsAdmin from '@/components/TokenStatsAdmin';
import {
  Box,
  Container,
  Tabs,
  Tab,
} from '@mui/material';

import Dashboard from './admin/Dashboard';
import UserManagement from './admin/UserManagement';
import InviteCodeManagement from './admin/InviteCodeManagement';
import SystemSettings from './admin/SystemSettings';
import ModelManagement from './admin/ModelManagement';

export default function AdminConfig() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'invites' | 'system' | 'models' | 'tokens'>('dashboard');

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">访问被拒绝</h1>
          <p className="text-gray-600 dark:text-gray-400">您没有权限访问此页面。</p>
        </div>
      </div>
    );
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'dashboard' | 'users' | 'invites' | 'system' | 'models' | 'tokens') => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }} className="bg-gray-50 dark:bg-gray-900">
      <Container maxWidth="xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            系统管理
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            管理用户、模型、系统设置和查看统计数据
          </p>
        </div>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            textColor="primary"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                minWidth: 100,
              }
            }}
          >
            <Tab label="仪表板" value="dashboard" />
            <Tab label="用户管理" value="users" />
            <Tab label="邀请码" value="invites" />
            <Tab label="模型管理" value="models" />
            <Tab label="系统设置" value="system" />
            <Tab label="Token 统计" value="tokens" />
          </Tabs>
        </Box>

        {/* 仪表板页面 */}
        {activeTab === 'dashboard' && (
          <Dashboard />
        )}

        {/* 用户管理页面 */}
        {activeTab === 'users' && (
          <UserManagement />
        )}

        {/* 邀请码管理页面 */}
        {activeTab === 'invites' && (
          <InviteCodeManagement />
        )}

        {/* 模型管理页面 */}
        {activeTab === 'models' && (
          <ModelManagement />
        )}

        {/* 系统设置页面 */}
        {activeTab === 'system' && (
          <SystemSettings />
        )}

        {/* Token 统计页面 */}
        {activeTab === 'tokens' && (
          <Box sx={{ p: 3 }}>
            <TokenStatsAdmin />
          </Box>
        )}
      </Container>
    </Box>
  );
}
