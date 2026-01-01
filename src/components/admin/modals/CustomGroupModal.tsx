'use client';

import React, { useState } from 'react';

// 自定义分组模态框组件
interface CustomGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    providerId: string;
    providers: any[];
    onSubmit: (data: { groupName: string; modelIds: string[] }) => void;
}

export default function CustomGroupModal({ isOpen, onClose, providerId, providers, onSubmit }: CustomGroupModalProps) {
    const [formData, setFormData] = useState({
        groupName: '',
        modelIds: [] as string[],
    });

    const provider = providers.find(p => p.id === providerId);
    const models = provider?.models || [];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.groupName.trim() || formData.modelIds.length === 0) {
            return;
        }
        onSubmit(formData);
        setFormData({ groupName: '', modelIds: [] });
    };

    const toggleModel = (modelId: string) => {
        setFormData(prevState => ({
            ...prevState,
            modelIds: prevState.modelIds.includes(modelId)
                ? prevState.modelIds.filter(id => id !== modelId)
                : [...prevState.modelIds, modelId]
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] overflow-y-auto" style={{ zIndex: 99999 }}>
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;

                <div
                    className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative p-6 max-h-[80vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        创建自定义分组
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                分组名称 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.groupName}
                                onChange={(e) => setFormData(prevState => ({ ...prevState, groupName: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                                style={{ pointerEvents: 'auto' }}
                                placeholder="例如: 对话模型"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                选择模型 <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3">
                                {models.map((model: any) => (
                                    <label key={model.id} className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.modelIds.includes(model.id)}
                                            onChange={() => toggleModel(model.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-4 w-4 text-gray-800 focus:ring-gray-500 border-gray-300 rounded pointer-events-auto"
                                            style={{ pointerEvents: 'auto' }}
                                        />
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {model.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {model.modelId}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                已选择 {formData.modelIds.length} 个模型
                            </p>
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
                                disabled={!formData.groupName.trim() || formData.modelIds.length === 0}
                                className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-md hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                创建分组
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
