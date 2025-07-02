'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/Toast';

interface TestItem {
  id: string;
  name: string;
  isEnabled: boolean;
  _isTemporary?: boolean;
}

export default function OptimisticUpdateTest() {
  const [items, setItems] = useState<TestItem[]>([
    { id: '1', name: '测试项目 1', isEnabled: true },
    { id: '2', name: '测试项目 2', isEnabled: false },
    { id: '3', name: '测试项目 3', isEnabled: true },
  ]);
  const toast = useToast();

  // 模拟状态切换 - 乐观更新 + 延迟验证
  const toggleItemStatus = async (itemId: string, currentStatus: boolean) => {
    // 保存原始状态
    const originalItem = items.find(item => item.id === itemId);
    if (!originalItem) return;

    // 1. 立即更新UI (乐观更新)
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, isEnabled: !currentStatus }
        : item
    ));

    // 显示即时反馈
    toast.success(currentStatus ? '项目已禁用' : '项目已启用');

    // 2. 模拟API请求 (随机成功/失败)
    try {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 30% 概率失败
      if (Math.random() < 0.3) {
        throw new Error('API request failed');
      }

      // 3. 延迟验证 (1.5秒后)
      setTimeout(async () => {
        // 模拟验证请求
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 20% 概率验证失败
        if (Math.random() < 0.2) {
          // 回滚状态
          setItems(prev => prev.map(item =>
            item.id === itemId
              ? { ...item, isEnabled: originalItem.isEnabled }
              : item
          ));
          toast.error('状态更新失败，已恢复原状态');
        }
      }, 1500);

    } catch (error) {
      // API调用失败，立即回滚
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, isEnabled: originalItem.isEnabled }
          : item
      ));
      toast.error('操作失败，已恢复原状态');
    }
  };

  // 模拟删除项目 - 乐观更新 + 延迟验证
  const deleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`确定要删除 "${itemName}" 吗？`)) return;

    // 保存原始数据
    const originalItem = items.find(item => item.id === itemId);
    if (!originalItem) return;

    // 1. 立即从UI移除
    setItems(prev => prev.filter(item => item.id !== itemId));
    toast.success('项目删除成功');

    // 2. 模拟API请求
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 25% 概率失败
      if (Math.random() < 0.25) {
        throw new Error('Delete request failed');
      }

      // 3. 延迟验证 (2秒后)
      setTimeout(async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 15% 概率验证失败
        if (Math.random() < 0.15) {
          // 恢复项目
          setItems(prev => [...prev, originalItem].sort((a, b) => a.id.localeCompare(b.id)));
          toast.error('项目删除失败，已恢复');
        }
      }, 2000);

    } catch (error) {
      // API调用失败，立即恢复
      setItems(prev => [...prev, originalItem].sort((a, b) => a.id.localeCompare(b.id)));
      toast.error('删除操作失败，已恢复项目');
    }
  };

  // 模拟添加项目 - 乐观更新 + 延迟验证
  const addItem = async () => {
    const newItem: TestItem = {
      id: `temp_${Date.now()}`,
      name: `新项目 ${Date.now()}`,
      isEnabled: true,
      _isTemporary: true,
    };

    // 1. 立即添加到UI
    setItems(prev => [...prev, newItem]);
    toast.success('开始创建新项目...');

    // 2. 模拟API请求
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // 20% 概率失败
      if (Math.random() < 0.2) {
        throw new Error('Create request failed');
      }

      // 3. 延迟验证 (3秒后)
      setTimeout(async () => {
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // 模拟服务器返回的真实数据
        const realItem: TestItem = {
          id: `real_${Date.now()}`,
          name: newItem.name,
          isEnabled: true,
        };

        // 替换临时项目
        setItems(prev => prev.map(item =>
          item.id === newItem.id ? realItem : item
        ));
        
        toast.success('项目创建成功');
      }, 3000);

    } catch (error) {
      // API调用失败，移除临时项目
      setItems(prev => prev.filter(item => item.id !== newItem.id));
      toast.error('创建项目失败');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        乐观更新测试
      </h2>
      
      <div className="mb-4">
        <button
          onClick={addItem}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          添加新项目
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              item._isTemporary
                ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-500 opacity-70'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
            }`}
          >
            <div className="flex-1">
              <div className={`font-medium ${
                item._isTemporary
                  ? 'text-gray-600 dark:text-gray-400'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {item.name}
                {item._isTemporary && (
                  <span className="ml-2 text-sm text-orange-600 dark:text-orange-400">
                    (创建中...)
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                ID: {item.id}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!item._isTemporary && (
                <>
                  <button
                    onClick={() => toggleItemStatus(item.id, item.isEnabled)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      item.isEnabled
                        ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {item.isEnabled ? '启用' : '禁用'}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id, item.name)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-200 transition-colors"
                  >
                    删除
                  </button>
                </>
              )}
              {item._isTemporary && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                  <span className="text-sm text-orange-600 dark:text-orange-400">创建中</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          测试说明
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• 状态切换：30% 概率API失败，20% 概率验证失败</li>
          <li>• 删除操作：25% 概率API失败，15% 概率验证失败</li>
          <li>• 添加项目：20% 概率API失败，3秒后完成验证</li>
          <li>• 所有操作都有乐观更新和延迟验证机制</li>
        </ul>
      </div>
    </div>
  );
}
