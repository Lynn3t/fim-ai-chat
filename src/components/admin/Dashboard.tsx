'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { SystemStats } from './types';

export default function Dashboard() {
    const { user: currentUser, authenticatedFetch } = useAuth();
    const { success: toastSuccess, error: toastError } = useToast();
    const toast = { success: toastSuccess, error: toastError };

    const [stats, setStats] = useState<SystemStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadDashboard = async () => {
        if (!currentUser) return;
        setIsLoading(true);

        try {
            const response = await authenticatedFetch('/api/admin/dashboard');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error(errorData.error || '加载仪表板数据失败');
            }
        } catch (error) {
            toast.error('加载仪表板数据失败');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, [currentUser]);

    if (isLoading && !stats) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">加载中...</p>
            </div>
        );
    }

    if (!stats) {
        return <div className="text-center py-8 text-gray-500">无法加载仪表板数据</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                    总用户数
                                </dt>
                                <dd>
                                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                                        {stats.totalUsers}
                                    </div>
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
                    <div className="text-sm">
                        <span className="text-green-600 font-medium">
                            {stats.activeUsers}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">
                            活跃用户
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                            </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                    邀请码使用率
                                </dt>
                                <dd>
                                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                                        {stats.totalInviteCodes > 0
                                            ? Math.round((stats.usedInviteCodes / stats.totalInviteCodes) * 100) + '%'
                                            : '0%'}
                                    </div>
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
                    <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                            {stats.usedInviteCodes} / {stats.totalInviteCodes} 已使用
                        </span>
                    </div>
                </div>
            </div>

            {/* Add more stats cards as needed */}
        </div>
    );
}
