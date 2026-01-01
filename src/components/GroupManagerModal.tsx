'use client';

import { useState } from 'react';

interface AIModel {
  id: string;
  name: string;
  modelId: string;
  enabled: boolean;
  isCustom: boolean;
  customGroup?: string;
}

interface CustomGroup {
  id: string;
  name: string;
  providerId: string;
}

interface GroupManagerModalProps {
  isOpen: boolean;
  providerId: string;
  models: AIModel[];
  customGroups: CustomGroup[];
  onClose: () => void;
  onCreateGroup: (name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onMoveModel: (modelId: string, groupName?: string) => void;
}

export function GroupManagerModal({
  isOpen,
  providerId,
  models,
  customGroups,
  onClose,
  onCreateGroup,
  onDeleteGroup,
  onMoveModel
}: GroupManagerModalProps) {
  const [newGroupName, setNewGroupName] = useState('');

  if (!isOpen) return null;

  const providerGroups = (customGroups || []).filter(g => g.providerId === providerId);

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            分组管理
          </h3>
          
          {/* 创建新分组 */}
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="输入新分组名称"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-700 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
            />
            <button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              创建分组
            </button>
          </div>

          {/* 现有分组列表 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">现有分组:</h4>
            {providerGroups.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">暂无自定义分组</p>
            ) : (
              providerGroups.map(group => (
                <div key={group.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {group.name}
                  </span>
                  <button
                    onClick={() => onDeleteGroup(group.id)}
                    className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                    title="删除分组"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 模型分组管理 */}
        <div className="flex-1 overflow-y-auto p-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">模型分组管理:</h4>
          <div className="space-y-3">
            {models.map(model => (
              <div key={model.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {model.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {model.modelId}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    当前分组: {model.customGroup || '默认分组'}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <select
                    value={model.customGroup || ''}
                    onChange={(e) => onMoveModel(model.id, e.target.value || undefined)}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-600 dark:text-white"
                  >
                    <option value="">默认分组</option>
                    {providerGroups.map(group => (
                      <option key={group.id} value={group.name}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
