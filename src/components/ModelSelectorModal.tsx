'use client';

import { useState, useMemo } from 'react';

interface ModelSelectorModalProps {
  isOpen: boolean;
  models: string[];
  onClose: () => void;
  onImport: (selectedModels: string[]) => void;
}

export function ModelSelectorModal({ isOpen, models, onClose, onImport }: ModelSelectorModalProps) {
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState('');

  // 过滤模型
  const filteredModels = useMemo(() => {
    if (!searchKeyword.trim()) return models;
    return models.filter(model =>
      model.toLowerCase().includes(searchKeyword.toLowerCase())
    );
  }, [models, searchKeyword]);

  if (!isOpen) return null;

  // 全选
  const handleSelectAll = () => {
    setSelectedModels(new Set(filteredModels));
  };

  // 全不选
  const handleDeselectAll = () => {
    setSelectedModels(new Set());
  };

  // 切换单个模型选择
  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelId)) {
        newSet.delete(modelId);
      } else {
        newSet.add(modelId);
      }
      return newSet;
    });
  };

  // 确认导入
  const handleImport = () => {
    onImport(Array.from(selectedModels));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            选择要导入的模型
          </h3>
          
          {/* 搜索框 */}
          <div className="mb-4">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索模型..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
              >
                全选 ({filteredModels.length})
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
              >
                全不选
              </button>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              已选择 {selectedModels.size} / {filteredModels.length} 个模型
            </span>
          </div>
        </div>

        {/* 模型列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {filteredModels.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                {searchKeyword ? '没有找到匹配的模型' : '没有可导入的模型'}
              </p>
            ) : (
              filteredModels.map((modelId) => (
                <div
                  key={modelId}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedModels.has(modelId)
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => toggleModel(modelId)}
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.has(modelId)}
                    onChange={() => toggleModel(modelId)}
                    className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {modelId}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Model ID: {modelId}
                    </p>
                  </div>
                  {selectedModels.has(modelId) && (
                    <div className="text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={selectedModels.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              导入 {selectedModels.size} 个模型
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
