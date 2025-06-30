'use client';

import { useState } from 'react';

interface AIModel {
  id: string;
  name: string;
  modelId: string;
  enabled: boolean;
  isCustom: boolean;
}

interface AIProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  models: AIModel[];
}

interface AIRenameModalProps {
  isOpen: boolean;
  model: AIModel;
  providers: AIProvider[];
  onClose: () => void;
  onRename: (newName: string) => void;
}

export function AIRenameModal({ isOpen, model, providers, onClose, onRename }: AIRenameModalProps) {
  const [selectedModelId, setSelectedModelId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewName, setPreviewName] = useState('');

  if (!isOpen) return null;

  // 获取可用的AI模型选项
  const availableModels = providers.flatMap(provider => 
    provider.models.filter(m => m.enabled).map(m => ({
      ...m,
      providerId: provider.id,
      providerName: provider.name,
      provider: provider
    }))
  );

  const handleAIRename = async () => {
    if (!selectedModelId) {
      alert('请选择AI模型');
      return;
    }

    const selectedModel = availableModels.find(m => m.id === selectedModelId);
    if (!selectedModel) {
      alert('选择的模型无效');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId: model.modelId,
          aiConfig: {
            apiKey: selectedModel.provider.apiKey,
            baseUrl: selectedModel.provider.baseUrl,
            model: selectedModel.modelId
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewName(data.renamedName);
      } else {
        alert('AI重命名失败，请稍后重试');
      }
    } catch (error) {
      console.error('AI重命名错误:', error);
      alert('AI重命名失败：' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (previewName) {
      onRename(previewName);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            AI自动重命名
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                当前模型ID
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded">
                {model.modelId}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                选择AI模型进行重命名
              </label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">请选择AI模型</option>
                {availableModels.map((aiModel) => (
                  <option key={aiModel.id} value={aiModel.id}>
                    {aiModel.name} ({aiModel.modelId}) - {aiModel.providerName}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAIRename}
              disabled={isLoading || !selectedModelId}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '正在重命名...' : '🤖 AI重命名'}
            </button>

            {previewName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI建议的名称
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-700">
                  {previewName}
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-3 justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!previewName}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              确认使用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
