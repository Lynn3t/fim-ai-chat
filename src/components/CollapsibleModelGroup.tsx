'use client';

import React, { useState } from 'react';
import { AIIcon } from './AIIcon';
import { SortableList } from './SortableList';
import { getGroupIcon } from '@/utils/aiModelUtils';

interface CollapsibleModelGroupProps {
  groupName: string;
  models: any[];
  isExpanded?: boolean;
  onToggle?: () => void;
  onModelReorder?: (reorderedModels: any[]) => void;
  renderModel: (model: any) => React.ReactNode;
  className?: string;
}

export function CollapsibleModelGroup({
  groupName,
  models,
  isExpanded = false,
  onToggle,
  onModelReorder,
  renderModel,
  className = ''
}: CollapsibleModelGroupProps) {
  const [internalExpanded, setInternalExpanded] = useState(isExpanded);
  
  const expanded = onToggle ? isExpanded : internalExpanded;
  const handleToggle = onToggle || (() => setInternalExpanded(!internalExpanded));

  const iconName = getGroupIcon(groupName);

  return (
    <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 ${className}`}>
      {/* 分组标题 - 可点击折叠/展开 */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* 分组图标 - 更加突出的logo */}
            <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-600 rounded-full p-1.5 flex items-center justify-center">
              <AIIcon modelId={models[0]?.modelId || groupName} size={24} />
            </div>
            
            {/* 分组名称和数量 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {groupName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {models.length} 个模型
              </p>
            </div>
          </div>
          
          {/* 展开/折叠图标 */}
          <div className="flex items-center space-x-2">
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                expanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 模型列表 - 可折叠 */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
            {models.length > 0 ? (
              onModelReorder ? (
                <SortableList
                  items={models}
                  onReorder={onModelReorder}
                >
                  {renderModel}
                </SortableList>
              ) : (
                <div className="space-y-2">
                  {models.map((model, index) => (
                    <div key={model.id || index}>
                      {renderModel(model)}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                该分组暂无模型
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CollapsibleGroupListProps {
  groups: Array<{
    name: string;
    models: any[];
    expanded?: boolean;
  }>;
  onGroupToggle?: (groupName: string) => void;
  onModelReorder?: (groupName: string, reorderedModels: any[]) => void;
  renderModel: (model: any) => React.ReactNode;
  className?: string;
}

export function CollapsibleGroupList({
  groups,
  onGroupToggle,
  onModelReorder,
  renderModel,
  className = ''
}: CollapsibleGroupListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {groups.map((group) => (
        <CollapsibleModelGroup
          key={group.name}
          groupName={group.name}
          models={group.models}
          isExpanded={group.expanded}
          onToggle={onGroupToggle ? () => onGroupToggle(group.name) : undefined}
          onModelReorder={onModelReorder ? (models) => onModelReorder(group.name, models) : undefined}
          renderModel={renderModel}
        />
      ))}
    </div>
  );
}
