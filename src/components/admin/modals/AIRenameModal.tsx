'use client';

import React, { useState } from 'react';

// AI重命名模态框组件
interface AIRenameModalProps {
    isOpen: boolean;
    onClose: () => void;
    providerId: string;
    providers: any[];
    onSubmit: (data: { aiModelId: string; selectedModels: string[] }) => void;
}

export default function AIRenameModal({ isOpen, onClose, providerId, providers, onSubmit }: AIRenameModalProps) {
    const [formData, setFormData] = useState({
        aiModelId: '',
        selectedModels: [] as string[],
    });

    const provider = providers.find(p => p.id === providerId);
    const models = provider?.models || [];

    // 获取所有可用的AI模型（用于重命名）
    const availableAIModels = providers.flatMap(p =>
        p.models?.filter((m: any) => m.isEnabled) || []
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.aiModelId || formData.selectedModels.length === 0) {
            return;
        }
        onSubmit(formData);
        setFormData({ aiModelId: '', selectedModels: [] });
    };

    const toggleModel = (modelId: string) => {
        setFormData(prevState => ({
            ...prevState,
            selectedModels: prevState.selectedModels.includes(modelId)
                ? prevState.selectedModels.filter(id => id !== modelId)
                : [...prevState.selectedModels, modelId]
        }));
    };

    const selectAll = () => {
        setFormData(prevState => ({
            ...prevState,
            selectedModels: models.map((m: any) => m.id)
        }));
    };

    const deselectAll = () => {
        setFormData(prevState => ({
            ...prevState,
            selectedModels: []
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
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative p-6 max-h-[80vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        AI 智能重命名
                    </h3>

                    <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                            AI将根据预设规则将模型ID转换为易读的名称，例如：
                        </p>
                        <ul className="text-xs text-gray-700 dark:text-gray-300 mt-2 space-y-1">
                            <li>• gpt-4o-mini → GPT-4o Mini</li>
                            <li>• deepseek-chat-v3-0324 → DeepSeek V3 [0324]</li>
                            <li>• deepseek-ai/deepseek-r1 → DeepSeek R1 {`{deepseek-ai}`}</li>
                        </ul>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                选择AI模型进行重命名 <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.aiModelId}
                                onChange={(e) => setFormData(prevState => ({ ...prevState, aiModelId: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white pointer-events-auto"
                                style={{ pointerEvents: 'auto' }}
                                required
                            >
                                <option value="">请选择用于重命名的AI模型</option>
                                {availableAIModels.map((model: any) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name} ({model.modelId})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    选择要重命名的模型 <span className="text-red-500">*</span>
                                </label>
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            selectAll();
                                        }}
                                        className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                                    >
                                        全选
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deselectAll();
                                        }}
                                        className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                                    >
                                        全不选
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3">
                                {models.map((model: any) => (
                                    <label key={model.id} className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.selectedModels.includes(model.id)}
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
                                已选择 {formData.selectedModels.length} 个模型
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
                                disabled={!formData.aiModelId || formData.selectedModels.length === 0}
                                className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-md hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                开始AI重命名
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
