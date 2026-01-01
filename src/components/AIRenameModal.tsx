'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';

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
  const [errorMessage, setErrorMessage] = useState('');
  const toast = useToast();

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
    setErrorMessage('');

    if (!selectedModelId) {
      setErrorMessage('请选择AI模型');
      return;
    }

    const selectedModel = availableModels.find(m => m.id === selectedModelId);
    if (!selectedModel) {
      setErrorMessage('选择的模型无效');
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
          aiModelId: selectedModel.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewName(data.renamedName);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'AI重命名失败，请稍后重试');
      }
    } catch (error) {
      console.error('AI重命名错误:', error);
      toast.error('AI重命名失败：网络错误');
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
                onChange={(e) => {
                  setSelectedModelId(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">请选择AI模型</option>
                {availableModels.map((aiModel) => (
                  <option key={aiModel.id} value={aiModel.id}>
                    {aiModel.name} ({aiModel.modelId}) - {aiModel.providerName}
                  </option>
                ))}
              </select>
              {errorMessage && (
                <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
              )}
            </div>

            <button
              onClick={handleAIRename}
              disabled={isLoading || !selectedModelId}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '正在重命名...' : 'AI重命名'}
            </button>

            {previewName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI建议的名称
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 p-2 rounded border border-gray-300 dark:border-gray-600">
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
              className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              确认使用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
