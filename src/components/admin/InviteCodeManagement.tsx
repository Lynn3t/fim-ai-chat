'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { InviteCode } from './types';

export default function InviteCodeManagement() {
    const { user: currentUser, authenticatedFetch } = useAuth();
    const { success: toastSuccess, error: toastError } = useToast();
    const toast = { success: toastSuccess, error: toastError };

    const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Create Invite Code State
    const [showCreateInviteModal, setShowCreateInviteModal] = useState(false);
    const [inviteFormData, setInviteFormData] = useState({
        count: 1,
        maxUses: 1
    });

    // Delete Invite Code State
    const [showDeleteInviteDialog, setShowDeleteInviteDialog] = useState(false);
    const [deletingInvite, setDeletingInvite] = useState<{ id: string; code: string } | null>(null);

    // Load Invite Codes
    const loadInviteCodes = async () => {
        if (!currentUser) return;
        setIsLoading(true);

        try {
            const response = await authenticatedFetch('/api/admin/codes?type=invite');
            if (response.ok) {
                const data = await response.json();
                setInviteCodes(data);
            } else {
                toast.error('加载邀请码失败');
            }
        } catch (error) {
            toast.error('加载邀请码失败');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadInviteCodes();
    }, [currentUser]);

    // Create Invite Code
    const createInviteCode = async (count: number = 1, maxUses: number = 1) => {
        if (!currentUser) return;

        try {
            const promises = [];
            for (let i = 0; i < count; i++) {
                promises.push(
                    authenticatedFetch('/api/admin/codes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'invite',
                            maxUses,
                        }),
                    })
                );
            }

            const responses = await Promise.all(promises);
            const successCount = responses.filter(r => r.ok).length;

            if (successCount === count) {
                toast.success(`成功创建 ${count} 个邀请码`);
            } else if (successCount > 0) {
                toast.success(`成功创建 ${successCount}/${count} 个邀请码`);
            } else {
                toast.error('创建邀请码失败');
            }

            loadInviteCodes();
            setShowCreateInviteModal(false);
            setInviteFormData({ count: 1, maxUses: 1 });
        } catch (error) {
            toast.error('创建邀请码失败');
        }
    };

    // Delete Invite Code
    const deleteInviteCode = async (codeId: string, code: string) => {
        if (!currentUser) return;

        try {
            const response = await authenticatedFetch(`/api/admin/codes/${codeId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('邀请码删除成功');
                loadInviteCodes();
                setShowDeleteInviteDialog(false);
                setDeletingInvite(null);
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || '删除邀请码失败';
                toast.error(errorMessage);
            }
        } catch (error) {
            toast.error('删除邀请码失败');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    邀请码管理
                </h2>
                <button
                    onClick={() => setShowCreateInviteModal(true)}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                >
                    创建邀请码
                </button>
            </div>

            {/* Quick Create */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    快速创建
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => createInviteCode(1, 1)}
                        className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="text-center">
                            <div className="text-lg font-medium text-gray-900 dark:text-white">单次使用</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">创建 1 个单次使用邀请码</div>
                        </div>
                    </button>

                    <button
                        onClick={() => createInviteCode(5, 1)}
                        className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="text-center">
                            <div className="text-lg font-medium text-gray-900 dark:text-white">批量创建</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">创建 5 个单次使用邀请码</div>
                        </div>
                    </button>

                    <button
                        onClick={() => createInviteCode(1, 10)}
                        className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="text-center">
                            <div className="text-lg font-medium text-gray-900 dark:text-white">多次使用</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">创建 1 个可用 10 次的邀请码</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Invite Codes List */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        邀请码列表 ({inviteCodes.length})
                    </h3>
                </div>

                {isLoading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">加载中...</p>
                    </div>
                ) : inviteCodes.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">暂无邀请码</p>
                    </div>
                ) : (
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
                                        创建者
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
                                {inviteCodes.map((code) => (
                                    <tr key={code.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-mono text-gray-900 dark:text-white">
                                                {code.code}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {code.currentUses} / {code.maxUses}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${code.currentUses >= code.maxUses
                                                    ? 'bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                    : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                                }`}>
                                                {code.currentUses >= code.maxUses ? '已用完' : '可用'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {code.creator.username}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {new Date(code.createdAt).toLocaleDateString('zh-CN')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => {
                                                    setDeletingInvite({ id: code.id, code: code.code });
                                                    setShowDeleteInviteDialog(true);
                                                }}
                                                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
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

            {/* Create Invite Modal */}
            {showCreateInviteModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setShowCreateInviteModal(false)}>
                            <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                                    创建邀请码
                                </h3>
                                <form onSubmit={(e) => { e.preventDefault(); createInviteCode(inviteFormData.count, inviteFormData.maxUses); }}>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            生成数量
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={inviteFormData.count}
                                            onChange={(e) => setInviteFormData(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            最大使用次数
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={inviteFormData.maxUses}
                                            onChange={(e) => setInviteFormData(prev => ({ ...prev, maxUses: parseInt(e.target.value) }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateInviteModal(false)}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                        >
                                            取消
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
                                        >
                                            创建
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Invite Dialog */}
            {showDeleteInviteDialog && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setShowDeleteInviteDialog(false)}>
                            <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                                    确认删除邀请码
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    您确定要删除邀请码 <b>{deletingInvite?.code}</b> 吗？此操作不可撤销。
                                </p>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteInviteDialog(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deletingInvite && deleteInviteCode(deletingInvite.id, deletingInvite.code)}
                                        className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
                                    >
                                        删除
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
