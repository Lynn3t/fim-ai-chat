'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import type { TokenStats, AccessCode, InviteCode, UserModel } from '@/types';

export function useUserConfig() {
  const { user, authenticatedFetch } = useAuth();
  const toast = useToast();

  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [availableModels, setAvailableModels] = useState<UserModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentModels, setRecentModels] = useState<string[]>([]);
  const [selectedDefaultModel, setSelectedDefaultModel] = useState<string>('');

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await authenticatedFetch('/api/user/dashboard');
      if (response.ok) {
        const data = await response.json();
        setTokenStats(data.tokenStats);
        setAccessCodes(data.accessCodes);
        setInviteCodes(data.inviteCodes);
        setAvailableModels(data.allowedModels);

        if (data.userSettings?.defaultModelId) {
          setSelectedDefaultModel(data.userSettings.defaultModelId);
        }

        const lastUsedModelId = localStorage.getItem('fimai-last-used-model');
        if (lastUsedModelId) {
          setRecentModels(prev => {
            const newModels = [lastUsedModelId];
            return [...new Set([...newModels, ...prev])].slice(0, 5);
          });
        }
      } else {
        toast.error('加载用户数据失败');
      }
    } catch {
      toast.error('加载用户数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [user, authenticatedFetch, toast]);

  // Create access code
  const createAccessCode = useCallback(async (selectedModelIds: string[]) => {
    if (!user) return false;

    try {
      const response = await authenticatedFetch('/api/user/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'access',
          allowedModelIds: selectedModelIds,
          maxUses: 10,
        }),
      });

      if (response.ok) {
        toast.success('访问码创建成功');
        loadDashboard();
        return true;
      } else {
        toast.error('创建访问码失败');
        return false;
      }
    } catch {
      toast.error('创建访问码失败');
      return false;
    }
  }, [user, authenticatedFetch, toast, loadDashboard]);

  // Create invite code
  const createInviteCode = useCallback(async () => {
    if (!user) return false;

    try {
      const response = await authenticatedFetch('/api/user/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invite',
          maxUses: 1,
        }),
      });

      if (response.ok) {
        toast.success('邀请码创建成功');
        loadDashboard();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || '创建邀请码失败');
        return false;
      }
    } catch {
      toast.error('创建邀请码失败');
      return false;
    }
  }, [user, authenticatedFetch, toast, loadDashboard]);

  // Delete invite code
  const deleteInviteCode = useCallback(async (codeId: string) => {
    if (!user) return false;

    try {
      const response = await authenticatedFetch('/api/user/codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeId,
          type: 'invite',
        }),
      });

      if (response.ok) {
        toast.success('邀请码已删除');
        loadDashboard();
        return true;
      } else {
        toast.error('删除邀请码失败');
        return false;
      }
    } catch {
      toast.error('删除邀请码失败');
      return false;
    }
  }, [user, authenticatedFetch, toast, loadDashboard]);

  // Delete access code
  const deleteAccessCode = useCallback(async (codeId: string) => {
    if (!user) return false;

    try {
      const response = await authenticatedFetch('/api/user/codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeId,
          type: 'access',
        }),
      });

      if (response.ok) {
        toast.success('访问码已删除');
        loadDashboard();
        return true;
      } else {
        toast.error('删除访问码失败');
        return false;
      }
    } catch {
      toast.error('删除访问码失败');
      return false;
    }
  }, [user, authenticatedFetch, toast, loadDashboard]);

  // Set default model
  const setDefaultModel = useCallback(async (modelId: string) => {
    if (!user) return false;

    try {
      const response = await authenticatedFetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultModelId: modelId
        }),
      });

      if (response.ok) {
        setSelectedDefaultModel(modelId);
        toast.success('默认模型已设置');
        return true;
      } else {
        toast.error('设置默认模型失败');
        return false;
      }
    } catch {
      toast.error('设置默认模型失败');
      return false;
    }
  }, [user, authenticatedFetch, toast]);

  // Clear recent models
  const clearRecentModels = useCallback(() => {
    localStorage.removeItem('fimai-last-used-model');
    setRecentModels([]);
    toast.success('已清除最近使用的模型记录');
  }, [toast]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  }, [toast]);

  // Initial load
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    // State
    user,
    tokenStats,
    accessCodes,
    inviteCodes,
    availableModels,
    isLoading,
    recentModels,
    selectedDefaultModel,

    // Actions
    createAccessCode,
    createInviteCode,
    deleteInviteCode,
    deleteAccessCode,
    setDefaultModel,
    clearRecentModels,
    copyToClipboard,

    // Refresh
    refresh: loadDashboard,
  };
}
