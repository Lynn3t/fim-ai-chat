'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AIIcon } from './AIIcon';
import { SortableList } from './SortableList';
import { getGroupIcon } from '@/utils/aiModelUtils';

interface ModelGroup {
  id: string;
  name: string;
  models: any[];
  expanded?: boolean;
  order?: number;
}

interface SortableModelGroupItemProps {
  group: ModelGroup;
  onToggle: (groupId: string) => void;
  onModelReorder: (groupId: string, reorderedModels: any[]) => void;
  renderModel: (model: any) => React.ReactNode;
}

function SortableModelGroupItem({ 
  group, 
  onToggle, 
  onModelReorder, 
  renderModel 
}: SortableModelGroupItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-4 cursor-grab active:cursor-grabbing z-10 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
        title="拖拽调整分组顺序"
      >
        <svg
          className="w-4 h-4 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>
      
      {/* 分组内容，添加左边距为拖拽手柄留出空间 */}
      <div className="pl-8">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          {/* 分组标题 - 可点击折叠/展开 */}
          <div 
            className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            onClick={() => onToggle(group.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* 分组图标 */}
                <AIIcon modelId={group.models[0]?.modelId || ''} size={20} />
                
                {/* 分组名称和数量 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {group.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {group.models.length} 个模型
                  </p>
                </div>
              </div>
              
              {/* 展开/折叠图标 */}
              <div className="flex items-center space-x-2">
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                    group.expanded ? 'rotate-180' : ''
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
          {group.expanded && (
            <div className="px-4 pb-4">
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                {group.models.length > 0 ? (
                  <div>
                    <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                      拖拽左侧图标可调整模型顺序
                    </div>
                    <SortableList
                      items={group.models}
                      onReorder={(reorderedModels) => onModelReorder(group.id, reorderedModels)}
                    >
                      {renderModel}
                    </SortableList>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                    该分组暂无模型
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SortableModelGroupListProps {
  groups: ModelGroup[];
  onGroupReorder: (groups: ModelGroup[]) => void;
  onGroupToggle: (groupId: string) => void;
  onModelReorder: (groupId: string, reorderedModels: any[]) => void;
  renderModel: (model: any) => React.ReactNode;
}

export function SortableModelGroupList({
  groups,
  onGroupReorder,
  onGroupToggle,
  onModelReorder,
  renderModel
}: SortableModelGroupListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = groups.findIndex((group) => group.id === active.id);
      const newIndex = groups.findIndex((group) => group.id === over.id);

      const reorderedGroups = arrayMove(groups, oldIndex, newIndex);
      
      // 更新order字段
      const groupsWithOrder = reorderedGroups.map((group, index) => ({
        ...group,
        order: index
      }));

      onGroupReorder(groupsWithOrder);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={groups} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {groups.map((group) => (
            <SortableModelGroupItem
              key={group.id}
              group={group}
              onToggle={onGroupToggle}
              onModelReorder={onModelReorder}
              renderModel={renderModel}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
