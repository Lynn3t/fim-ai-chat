'use client';

import React from 'react';
import { SortableList } from './SortableList';

interface AIModel {
  id: string;
  name: string;
  modelId: string;
  enabled: boolean;
  isCustom: boolean;
  customGroup?: string;
  order?: number;
}



interface SortableModelListProps {
  models: AIModel[];
  onReorder: (models: AIModel[]) => void;
  children: (model: AIModel) => React.ReactNode;
}

export function SortableModelList({ models, onReorder, children }: SortableModelListProps) {
  return (
    <SortableList items={models} onReorder={onReorder}>
      {children}
    </SortableList>
  );
}
