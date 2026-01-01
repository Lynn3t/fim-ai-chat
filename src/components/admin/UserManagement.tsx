'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import {
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper
} from '@mui/material';
import { User } from './types';

export default function UserManagement() {
    const { user: currentUser, authenticatedFetch } = useAuth();
    const { success: toastSuccess, error: toastError } = useToast();
    const toast = { success: toastSuccess, error: toastError };

    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Create User State
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [createUserData, setCreateUserData] = useState({
        username: '',
        email: '',
        password: '',
        isGeneratingPassword: false
    });

    // Reset Password State
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [resetPasswordData, setResetPasswordData] = useState({
        userId: '',
        username: '',
        newPassword: ''
    });
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    // Delete User State
    const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
    const [deletingUser, setDeletingUser] = useState<{ id: string; username: string } | null>(null);

    // Load Users
    const loadUsers = async () => {
        if (!currentUser) return;
        setIsLoading(true);

        try {
            const response = await authenticatedFetch('/api/admin/users');
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

    useEffect(() => {
        loadUsers();
    }, [currentUser]);

    // Toggle User Status
    const toggleUserStatus = async (userId: string, isActive: boolean) => {
        if (!currentUser) return;

        const originalUser = users.find(u => u.id === userId);
        if (!originalUser) return;

        // Optimistic update
        setUsers(prev => prev.map(user =>
            user.id === userId
                ? { ...user, isActive: !isActive }
                : user
        ));

        toast.success(isActive ? '用户已禁用' : '用户已启用');

        try {
            const response = await authenticatedFetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isActive: !isActive,
                }),
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            // Delayed verification
            setTimeout(async () => {
                try {
                    const verifyResponse = await authenticatedFetch(`/api/admin/users/${userId}`);
                    if (verifyResponse.ok) {
                        const user = await verifyResponse.json();
                        if (user.isActive !== !isActive) {
                            setUsers(prev => prev.map(u =>
                                u.id === userId ? { ...u, isActive: originalUser.isActive } : u
                            ));
                            toast.error('用户状态更新失败，已恢复原状态');
                        }
                    }
                } catch {
                    setUsers(prev => prev.map(u =>
                        u.id === userId ? { ...u, isActive: originalUser.isActive } : u
                    ));
                    toast.error('无法验证用户状态更新，已恢复原状态');
                }
            }, 1500);

        } catch (error) {
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, isActive: originalUser.isActive } : u
            ));
            toast.error('操作失败，已恢复原状态');
        }
    };

    // Generate Password
    const generatePassword = (length = 12) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            password += chars[randomIndex];
        }
        return password;
    };

    // Create User
    const createUser = async () => {
        if (!currentUser || !createUserData.username) return;

        try {
            const password = createUserData.password || generatePassword(12);

            const response = await authenticatedFetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: createUserData.username,
                    email: createUserData.email || undefined,
                    password: password,
                    role: 'USER'
                }),
            });

            if (response.ok) {
                toast.success(`用户创建成功，密码: ${password}`);
                setShowCreateUserModal(false);
                setTimeout(() => {
                    setCreateUserData({
                        username: '',
                        email: '',
                        password: '',
                        isGeneratingPassword: false
                    });
                    loadUsers();
                }, 100);
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || '创建用户失败';
                toast.error(errorMessage);
            }
        } catch (error) {
            toast.error('创建用户失败');
        }
    };

    // Reset Password
    const resetUserPassword = async () => {
        if (!currentUser || !resetPasswordData.userId || !resetPasswordData.newPassword) return;

        setIsResettingPassword(true);
        try {
            const response = await authenticatedFetch(`/api/admin/users/${resetPasswordData.userId}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newPassword: resetPasswordData.newPassword
                }),
            });

            if (response.ok) {
                toast.success(`用户 "${resetPasswordData.username}" 的密码已重置`);
                setShowResetPasswordModal(false);
                setResetPasswordData({ userId: '', username: '', newPassword: '' });
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || '密码重置失败';
                toast.error(errorMessage);
            }
        } catch (error) {
            toast.error('密码重置失败');
        } finally {
            setIsResettingPassword(false);
        }
    };

    // Delete User
    const deleteUser = async (userId: string, username: string) => {
        if (!currentUser) return;

        const originalUser = users.find(u => u.id === userId);
        if (!originalUser) return;

        setUsers(prev => prev.filter(u => u.id !== userId));
        toast.success('用户删除成功');
        setShowDeleteUserDialog(false);
        setDeletingUser(null);

        try {
            const response = await authenticatedFetch(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                setUsers(prev => [...prev, originalUser].sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ));

                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || '删除用户失败';
                toast.error(errorMessage);
            }
        } catch (error) {
            setUsers(prev => [...prev, originalUser].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ));
            toast.error('删除操作失败');
        }
    };

    return (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h2">
                    用户管理
                </Typography>
                <Box>
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ mr: 1 }}
                        onClick={() => {
                            setCreateUserData({
                                username: '',
                                email: '',
                                password: '',
                                isGeneratingPassword: false
                            });
                            setShowCreateUserModal(true);
                        }}
                    >
                        创建用户
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'right' }}>
                        共 {users.length} 个用户
                    </Typography>
                </Box>
            </Box>

            <Paper sx={{ borderRadius: 1, overflow: 'hidden' }}>
                {isLoading ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Box sx={{ display: 'inline-block', animation: 'spin 1s linear infinite', mb: 1 }}>
                            ⏳
                        </Box>
                        <Typography color="text.secondary">加载中...</Typography>
                    </Box>
                ) : users.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">暂无用户数据</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>用户信息</TableCell>
                                    <TableCell>角色</TableCell>
                                    <TableCell>状态</TableCell>
                                    <TableCell>Token 使用</TableCell>
                                    <TableCell>操作</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {user.username}
                                                </Typography>
                                                {user.email && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        {user.email}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={user.role}
                                                color={user.role === 'ADMIN' ? 'secondary' : 'primary'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={user.isActive ? '活跃' : '禁用'}
                                                color={user.isActive ? 'success' : 'error'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {user.tokenUsage ? (
                                                <Box>
                                                    <Typography variant="body2">{user.tokenUsage.totalTokens.toLocaleString()} tokens</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        ¥{user.tokenUsage.cost.toFixed(2)}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                {user.role !== 'ADMIN' && (
                                                    <>
                                                        <Button
                                                            variant="text"
                                                            size="small"
                                                            color="inherit"
                                                            sx={{ color: '#000000' }}
                                                            onClick={() => toggleUserStatus(user.id, user.isActive)}
                                                        >
                                                            {user.isActive ? '禁用' : '启用'}
                                                        </Button>
                                                        <Button
                                                            variant="text"
                                                            size="small"
                                                            color="inherit"
                                                            sx={{ color: '#000000' }}
                                                            onClick={() => {
                                                                setResetPasswordData({ userId: user.id, username: user.username, newPassword: '' });
                                                                setShowResetPasswordModal(true);
                                                            }}
                                                        >
                                                            重置密码
                                                        </Button>
                                                        <Button
                                                            variant="text"
                                                            size="small"
                                                            color="error"
                                                            onClick={() => {
                                                                setDeletingUser({ id: user.id, username: user.username });
                                                                setShowDeleteUserDialog(true);
                                                            }}
                                                        >
                                                            删除
                                                        </Button>
                                                    </>
                                                )}
                                                {user.role === 'ADMIN' && (
                                                    <>
                                                        <Button
                                                            variant="text"
                                                            size="small"
                                                            color="inherit"
                                                            sx={{ color: '#000000' }}
                                                            onClick={() => {
                                                                setResetPasswordData({ userId: user.id, username: user.username, newPassword: '' });
                                                                setShowResetPasswordModal(true);
                                                            }}
                                                        >
                                                            重置密码
                                                        </Button>
                                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, alignSelf: 'center' }}>
                                                            (管理员)
                                                        </Typography>
                                                    </>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Delete User Dialog */}
            <Dialog
                open={showDeleteUserDialog}
                onClose={() => {
                    setShowDeleteUserDialog(false);
                    setDeletingUser(null);
                }}
            >
                <DialogTitle>确认删除用户</DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        您确定要删除用户 <b>{deletingUser?.username}</b> 吗？此操作不可撤销，将删除该用户的所有数据。
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setShowDeleteUserDialog(false);
                        setDeletingUser(null);
                    }} color="primary">
                        取消
                    </Button>
                    <Button
                        onClick={() => deletingUser && deleteUser(deletingUser.id, deletingUser.username)}
                        color="error"
                        variant="contained"
                    >
                        删除
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create User Modal */}
            {showCreateUserModal && (
                <div className="fixed inset-0 z-[99999] overflow-y-auto" style={{ zIndex: 99999 }}>
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setShowCreateUserModal(false)}>
                            <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative">
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">创建新用户</h3>
                                <form onSubmit={(e) => { e.preventDefault(); createUser(); }}>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">用户名 *</label>
                                        <input
                                            type="text"
                                            value={createUserData.username}
                                            onChange={(e) => setCreateUserData(prev => ({ ...prev, username: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
                                            required
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">邮箱</label>
                                        <input
                                            type="email"
                                            value={createUserData.email}
                                            onChange={(e) => setCreateUserData(prev => ({ ...prev, email: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">密码</label>
                                            <button
                                                type="button"
                                                onClick={() => setCreateUserData(prev => ({ ...prev, password: generatePassword(12) }))}
                                                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                            >
                                                生成随机密码
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={createUserData.password}
                                            onChange={(e) => setCreateUserData(prev => ({ ...prev, password: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
                                            placeholder="留空将自动生成"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateUserModal(false)}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                        >
                                            取消
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!createUserData.username}
                                            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 disabled:opacity-50"
                                        >
                                            创建用户
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetPasswordModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setShowResetPasswordModal(false)}>
                            <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">重置密码</h3>
                                <p className="text-sm text-gray-500 mb-4">正在为用户 <b>{resetPasswordData.username}</b> 重置密码</p>
                                <form onSubmit={(e) => { e.preventDefault(); resetUserPassword(); }}>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">新密码</label>
                                        <input
                                            type="password"
                                            value={resetPasswordData.newPassword}
                                            onChange={(e) => setResetPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
                                            minLength={6}
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setShowResetPasswordModal(false)}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                        >
                                            取消
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isResettingPassword || !resetPasswordData.newPassword || resetPasswordData.newPassword.length < 6}
                                            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 disabled:opacity-50"
                                        >
                                            {isResettingPassword ? '处理中...' : '重置密码'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Box>
    );
}
