'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

// 编辑模型对话框组件
interface EditModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { id: string, name: string, group?: string }) => void;
    model: any;
    groupOptions: string[];
}

export default function EditModelModal({ isOpen, onClose, onSubmit, model, groupOptions = [] }: EditModelModalProps) {
    const { error: toastError } = useToast();
    const [formData, setFormData] = useState({
        id: '',
        modelId: '',
        name: '',
        group: '',
        description: '',
    });

    // 初始化表单数据
    useEffect(() => {
        if (model) {
            setFormData({
                id: model.id || '',
                modelId: model.modelId || '',
                name: model.name || '',
                group: model.group || '',
                description: model.description || '',
            });
        }
    }, [model]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toastError('请填写模型名称');
            return;
        }

        onSubmit({
            id: formData.id,
            name: formData.name.trim(),
            group: formData.group || undefined,
        });
    };

    if (!isOpen || !model) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    编辑模型
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            模型ID
                        </label>
                        <input
                            type="text"
                            value={formData.modelId}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            模型ID不可修改
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
                            placeholder="例如: GPT-4o"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            显示在界面上的模型名称
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            模型分组
                        </label>
                        <div className="relative">
                            <select
                                value={formData.group || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white appearance-none"
                            >
                                <option value="">-- 无分组 --</option>
                                {groupOptions.map((group) => (
                                    <option key={group} value={group}>
                                        {group}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            模型将在分组中按顺序显示
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            描述（可选）
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
                            rows={3}
                            placeholder="模型描述..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-md hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                            保存更改
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
