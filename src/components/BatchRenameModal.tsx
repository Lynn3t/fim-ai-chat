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

interface BatchRenameModalProps {
  isOpen: boolean;
  provider: AIProvider;
  providers: AIProvider[];
  onClose: () => void;
  onRename: (renamedModels: { id: string; newName: string }[]) => void;
}

interface RenameProgress {
  modelId: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  newName?: string;
  error?: string;
}

export function BatchRenameModal({ isOpen, provider, providers, onClose, onRename }: BatchRenameModalProps) {
  const [selectedAIModelId, setSelectedAIModelId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<RenameProgress[]>([]);
  const [completed, setCompleted] = useState(false);

  if (!isOpen) return null;

  // 获取可用的AI模型选项
  const availableModels = providers.flatMap(p => 
    p.models.filter(m => m.enabled).map(m => ({
      ...m,
      providerId: p.id,
      providerName: p.name,
      provider: p
    }))
  );

  const handleStartBatchRename = async () => {
    if (!selectedAIModelId) {
      alert('请选择AI模型');
      return;
    }

    const selectedModel = availableModels.find(m => m.id === selectedAIModelId);
    if (!selectedModel) {
      alert('选择的模型无效');
      return;
    }

    setIsProcessing(true);
    setCompleted(false);
    
    // 初始化进度
    const initialProgress: RenameProgress[] = provider.models.map(model => ({
      modelId: model.id,
      status: 'pending'
    }));
    setProgress(initialProgress);

    const renamedModels: { id: string; newName: string }[] = [];

    // 逐个处理模型重命名
    for (let i = 0; i < provider.models.length; i++) {
      const model = provider.models[i];
      
      // 更新当前模型状态为处理中
      setProgress(prev => prev.map(p => 
        p.modelId === model.id ? { ...p, status: 'processing' } : p
      ));

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
          const newName = data.renamedName;
          
          // 更新成功状态
          setProgress(prev => prev.map(p => 
            p.modelId === model.id ? { ...p, status: 'success', newName } : p
          ));
          
          renamedModels.push({ id: model.id, newName });
        } else {
          // 更新错误状态
          setProgress(prev => prev.map(p => 
            p.modelId === model.id ? { ...p, status: 'error', error: '重命名失败' } : p
          ));
        }
      } catch {
        // 更新错误状态
        setProgress(prev => prev.map(p =>
          p.modelId === model.id ? { ...p, status: 'error', error: '网络错误' } : p
        ));
      }

      // 添加延迟避免API限制
      if (i < provider.models.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsProcessing(false);
    setCompleted(true);
    
    // 应用重命名结果
    if (renamedModels.length > 0) {
      onRename(renamedModels);
    }
  };

  const getStatusIcon = (status: RenameProgress['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '';
    }
  };

  const getStatusText = (status: RenameProgress['status']) => {
    switch (status) {
      case 'pending':
        return '等待中';
      case 'processing':
        return '处理中...';
      case 'success':
        return '成功';
      case 'error':
        return '失败';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-50" onClick={!isProcessing ? onClose : undefined} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            批量AI重命名 - {provider.name}
          </h3>
          
          {!isProcessing && !completed && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  选择AI模型进行重命名
                </label>
                <select
                  value={selectedAIModelId}
                  onChange={(e) => setSelectedAIModelId(e.target.value)}
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
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  将对 {provider.models.length} 个模型进行批量重命名，这可能需要一些时间。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 进度显示 */}
        {(isProcessing || completed) && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-3">
              {progress.map((item) => {
                const model = provider.models.find(m => m.id === item.modelId);
                if (!model) return null;
                
                return (
                  <div key={item.modelId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getStatusIcon(item.status)}</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {model.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {model.modelId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {getStatusText(item.status)}
                      </p>
                      {item.newName && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          → {item.newName}
                        </p>
                      )}
                      {item.error && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {item.error}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3 justify-end">
            {!isProcessing && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {completed ? '关闭' : '取消'}
              </button>
            )}
            {!isProcessing && !completed && (
              <button
                onClick={handleStartBatchRename}
                disabled={!selectedAIModelId}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                🤖 开始批量重命名
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
