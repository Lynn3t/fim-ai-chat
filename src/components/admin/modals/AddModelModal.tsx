'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/Toast';

// 添加自定义模型模态框组件
interface AddModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { modelId: string; name: string; description?: string }) => void;
}

export default function AddModelModal({ isOpen, onClose, onSubmit }: AddModelModalProps) {
    const { error: toastError } = useToast();
    const [formData, setFormData] = useState({
        modelId: '',
        name: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.modelId.trim()) {
            toastError('请填写模型ID');
            return;
        }

        if (!formData.name.trim()) {
            toastError('请填写模型名称');
            return;
        }

        onSubmit({
            modelId: formData.modelId.trim(),
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
        });

        // 重置表单
        setFormData({
            modelId: '',
            name: '',
            description: '',
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] overflow-y-auto" style={{ zIndex: 99999 }}>
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
                </div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative p-6"
                    onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        添加自定义模型
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                模型ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.modelId}
                                onChange={(e) => setFormData(prev => ({ ...prev, modelId: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}
                                placeholder="例如: gpt-4o-mini"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                用于API请求的模型标识符
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                模型名称 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}
                                placeholder="例如: GPT-4o Mini"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                用户界面显示的模型名称
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                描述（可选）
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 99999 }}
                                rows={3}
                                placeholder="模型描述..."
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                onClick={(e) => e.stopPropagation()}
                                className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-md hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                添加模型
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
