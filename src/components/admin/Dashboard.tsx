'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { SystemStats } from './types';

// 格式化数字
function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// 格式化金额
function formatCost(cost: number): string {
    return '$' + cost.toFixed(4);
}

// 统计卡片组件
function StatCard({
    icon,
    title,
    value,
    subValue,
    subLabel,
}: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    subValue?: string | number;
    subLabel?: string;
}) {
    return (
        <div className="bg-gray-100 dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0 bg-gray-800 dark:bg-gray-600 rounded-md p-3">
                        {icon}
                    </div>
                    <div className="ml-5 w-0 flex-1">
                        <dl>
                            <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                                {title}
                            </dt>
                            <dd>
                                <div className="text-lg font-medium text-gray-900 dark:text-white">
                                    {value}
                                </div>
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
            {(subValue !== undefined || subLabel) && (
                <div className="bg-gray-200 dark:bg-gray-700 px-5 py-3">
                    <div className="text-sm">
                        {subValue !== undefined && (
                            <span className="text-gray-800 dark:text-gray-100 font-medium">
                                {subValue}
                            </span>
                        )}
                        {subLabel && (
                            <span className="text-gray-600 dark:text-gray-400 ml-2">
                                {subLabel}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// 图标组件
const Icons = {
    Users: () => (
        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    Ticket: () => (
        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
    ),
    Cube: () => (
        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
    ),
    Token: () => (
        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
    ),
    Request: () => (
        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
    ),
    Dollar: () => (
        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Average: () => (
        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    ),
};

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

    // 计算平均每个请求的开销
    const avgCostPerRequest = stats.todayRequests && stats.todayRequests > 0
        ? (stats.todayCost || 0) / stats.todayRequests
        : 0;

    return (
        <div className="space-y-6">
            {/* 第一行：用户、邀请码、模型 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    icon={<Icons.Users />}
                    title="总用户数"
                    value={stats.totalUsers}
                    subValue={stats.activeUsers}
                    subLabel="活跃用户"
                />
                <StatCard
                    icon={<Icons.Ticket />}
                    title="邀请码"
                    value={`${stats.usedInviteCodes || 0} / ${stats.totalInviteCodes || 0}`}
                    subValue={stats.totalInviteCodes && stats.totalInviteCodes > 0
                        ? Math.round(((stats.usedInviteCodes || 0) / stats.totalInviteCodes) * 100) + '%'
                        : '0%'}
                    subLabel="使用率"
                />
                <StatCard
                    icon={<Icons.Cube />}
                    title="模型总数"
                    value={stats.totalModels || 0}
                    subValue={stats.activeModels || 0}
                    subLabel="已启用"
                />
            </div>

            {/* 第二行：今日统计 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<Icons.Token />}
                    title="今日Token总数"
                    value={formatNumber(stats.todayTokens || 0)}
                    subValue={formatNumber(stats.totalTokens || 0)}
                    subLabel="总计"
                />
                <StatCard
                    icon={<Icons.Request />}
                    title="今日请求数"
                    value={formatNumber(stats.todayRequests || 0)}
                    subValue={formatNumber(stats.totalRequests || 0)}
                    subLabel="总计"
                />
                <StatCard
                    icon={<Icons.Dollar />}
                    title="今日开销"
                    value={formatCost(stats.todayCost || 0)}
                    subValue={formatCost(stats.totalCost || 0)}
                    subLabel="总计"
                />
                <StatCard
                    icon={<Icons.Average />}
                    title="平均请求开销"
                    value={formatCost(avgCostPerRequest)}
                    subLabel="每请求"
                />
            </div>
        </div>
    );
}
