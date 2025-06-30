'use client';

import React from 'react';
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

interface GroupItem {
  id: string;
  name: string;
  order?: number;
}

interface SortableGroupItemProps {
  group: GroupItem;
  children: React.ReactNode;
}

function SortableGroupItem({ group, children }: SortableGroupItemProps) {
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
        className="absolute left-2 top-3 cursor-grab active:cursor-grabbing z-10 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
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
      {/* 内容区域，添加左边距为拖拽手柄留出空间 */}
      <div className="pl-8">
        {children}
      </div>
    </div>
  );
}

interface SortableGroupListProps {
  groups: GroupItem[];
  onReorder: (groups: GroupItem[]) => void;
  children: (group: GroupItem) => React.ReactNode;
}

export function SortableGroupList({ groups, onReorder, children }: SortableGroupListProps) {
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

      onReorder(groupsWithOrder);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={groups} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {groups.map((group) => (
            <SortableGroupItem key={group.id} group={group}>
              {children(group)}
            </SortableGroupItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
