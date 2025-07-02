'use client';

import { useState } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
  requireTextConfirmation?: string;
  isLoading?: boolean;
  steps?: string[];
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'info',
  requireTextConfirmation,
  isLoading = false,
  steps = []
}: ConfirmDialogProps) {
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireTextConfirmation && inputText !== requireTextConfirmation) {
      return;
    }
    onConfirm();
  };

  const handleCancel = () => {
    setInputText('');
    onCancel();
  };

  const isConfirmDisabled =
    isLoading ||
    (requireTextConfirmation && inputText !== requireTextConfirmation);

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getConfirmButtonStyles = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />
      
      {/* 对话框 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
        <div className="p-6">
          {/* 标题 */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
          
          {/* 消息 */}
          <div className={`p-4 rounded-lg border ${getTypeStyles()} mb-6`}>
            <p className="text-sm">{message}</p>
          </div>

          {/* 步骤列表 */}
          {steps.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                此操作将会：
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {steps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 文本确认输入 */}
          {requireTextConfirmation && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                请输入 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-red-600 dark:text-red-400 font-mono">
                  {requireTextConfirmation}
                </code> 来确认：
              </label>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                placeholder={requireTextConfirmation}
                disabled={isLoading}
              />
              {inputText && inputText !== requireTextConfirmation && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  输入的文本不匹配
                </p>
              )}
            </div>
          )}

          {/* 按钮 */}
          <div className="flex space-x-3 justify-end">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonStyles()}`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  处理中...
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for managing confirm dialogs
export function useConfirm() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const confirm = (
    title: string,
    message: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: 'danger' | 'warning' | 'info';
    }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        title,
        message,
        ...options,
        onConfirm: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        }
      });
    });
  };

  const handleCancel = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    dialog.onConfirm?.();
  };

  return {
    confirm,
    ConfirmDialog: () => (
      <ConfirmDialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        type={dialog.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    )
  };
}
