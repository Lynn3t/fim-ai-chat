'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from './Toast';
import { 
  TextField, 
  Box, 
  Button, 
  IconButton,
  Paper
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface MessageActionsProps {
  content: string;
  messageRole: 'user' | 'assistant';
  onCopy?: () => void;
  onDelete?: () => void;
  onEdit?: (newContent: string) => void;
  onResend?: () => void;
  tokenUsage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    is_estimated?: boolean;
  };
  isInMessageBubble?: boolean; // 是否在消息气泡内
  parentRef?: React.RefObject<HTMLElement>; // 父元素引用，用于扩大悬停区域
}

export function MessageActions({
  content,
  messageRole,
  onCopy,
  onDelete,
  onEdit,
  onResend,
  tokenUsage,
  isInMessageBubble = false,
  parentRef
}: MessageActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const toast = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const messageActionsRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 检测是否为移动设备
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // 编辑模式下自适应文本框高度
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, editContent]);

  // 处理移动端点击行为
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        messageActionsRef.current && 
        !messageActionsRef.current.contains(event.target as Node) && 
        isMobile && 
        isVisible
      ) {
        setIsVisible(false);
      }
    };
    
    if (isMobile) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMobile, isVisible]);

  // 为父元素添加鼠标事件监听
  useEffect(() => {
    if (!parentRef?.current || isMobile) return;
    
    const parent = parentRef.current;
    
    // 创建一个扩展的检测区域
    const extendedArea = document.createElement('div');
    extendedArea.style.position = 'absolute';
    extendedArea.style.top = '-10px';  // 向上扩展
    extendedArea.style.left = '-10px'; // 向左扩展
    extendedArea.style.right = '-10px'; // 向右扩展
    extendedArea.style.bottom = '-30px'; // 向下扩展更多，覆盖按钮区域
    extendedArea.style.zIndex = '-1';   // 放在内容下面
    
    // 将扩展区域添加到父元素
    if (parent.style.position !== 'absolute' && parent.style.position !== 'relative') {
      parent.style.position = 'relative';
    }
    parent.appendChild(extendedArea);
    
    const handleParentMouseEnter = () => {
      setIsVisible(true);
    };
    
    const handleParentMouseLeave = (e: MouseEvent) => {
      // 检查鼠标是否移动到按钮区域
      const buttonArea = messageActionsRef.current;
      if (buttonArea && (buttonArea === e.relatedTarget || buttonArea.contains(e.relatedTarget as Node))) {
        return; // 如果移动到按钮区域，不隐藏
      }
      
      // 给一个小延迟，以防止鼠标在气泡和按钮之间移动时闪烁
      setTimeout(() => {
        // 再次检查当前鼠标是否在按钮区域上
        if (buttonArea && buttonArea.matches(':hover')) {
          return;
        }
        setIsVisible(false);
      }, 50);
    };
    
    parent.addEventListener('mouseenter', handleParentMouseEnter);
    parent.addEventListener('mouseleave', handleParentMouseLeave);
    
    return () => {
      parent.removeEventListener('mouseenter', handleParentMouseEnter);
      parent.removeEventListener('mouseleave', handleParentMouseLeave);
      if (extendedArea.parentNode === parent) {
        parent.removeChild(extendedArea);
      }
    };
  }, [parentRef, isMobile, messageActionsRef]);

  // 处理消息操作的显示/隐藏
  const handleMessageClick = () => {
    if (isMobile) {
      setIsVisible(prev => !prev);
    }
  };

  // 鼠标悬停处理 - 仅当没有父元素引用时使用
  const handleMouseEnter = () => {
    if (!isMobile && !parentRef) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile && !parentRef) {
      setIsVisible(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      toast.success('已复制到剪贴板');
      onCopy?.();
    } catch {
      toast.error('复制失败');
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditContent(content);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() !== content.trim()) {
      onEdit?.(editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(content);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  const handleResend = (e: React.MouseEvent) => {
    e.stopPropagation();
    onResend?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSaveEdit();
    }
  };

  // 如果在编辑模式且在消息气泡内，返回编辑框代替消息内容
  if (isEditing && isInMessageBubble) {
    return (
      <Box sx={{ width: '100%' }}>
        <TextField
          multiline
          fullWidth
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="outlined"
          size="small"
          inputRef={textareaRef}
          autoFocus
          minRows={3}
          sx={{ mb: 1 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            onClick={handleCancelEdit}
            variant="outlined"
            color="inherit"
            size="small"
            startIcon={<CloseIcon />}
          >
            取消 (Esc)
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            color="primary"
            size="small"
            startIcon={<SaveIcon />}
          >
            保存并重发 (Ctrl+Enter)
          </Button>
        </Box>
      </Box>
    );
  }

  // 如果不在消息气泡内，且处于编辑模式
  if (isEditing && !isInMessageBubble) {
    return (
      <Box sx={{ mt: 1 }}>
        <Paper elevation={0} variant="outlined" sx={{ p: 1.5 }}>
          <TextField
            multiline
            fullWidth
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="outlined"
            size="small"
            inputRef={textareaRef}
            autoFocus
            minRows={3}
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              onClick={handleCancelEdit}
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<CloseIcon />}
            >
              取消 (Esc)
            </Button>
            <Button
              onClick={handleSaveEdit}
              variant="contained"
              color="primary"
              size="small"
              startIcon={<SaveIcon />}
            >
              保存并重发 (Ctrl+Enter)
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box 
      ref={messageActionsRef}
      sx={{ position: 'relative' }}
      onMouseEnter={() => {
        setIsVisible(true); // Always show buttons when hovering directly over them
        handleMouseEnter();
      }}
      onMouseLeave={(e) => {
        // Only hide if we're not moving to the parent element
        if (parentRef?.current && !parentRef.current.contains(e.relatedTarget as Node)) {
          setIsVisible(false);
        }
        handleMouseLeave();
      }}
      onClick={handleMessageClick}
    >
      <Box 
        sx={{ 
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 200ms',
          pointerEvents: isVisible ? 'auto' : 'none', // Prevent interaction when invisible
          padding: '3px',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          }
        }}
      >
        <IconButton
          onClick={handleCopy}
          size="small"
          title="复制"
          sx={{ color: 'text.secondary' }}
        >
          <CopyIcon fontSize="small" />
        </IconButton>

        {messageRole === 'user' && (
          <IconButton
            onClick={handleEdit}
            size="small"
            title="编辑"
            sx={{ color: 'text.secondary' }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}

        {messageRole === 'user' && onResend && (
          <IconButton
            onClick={handleResend}
            size="small"
            title="重新发送"
            sx={{ color: 'text.secondary' }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        )}

        <IconButton
          onClick={handleDelete}
          size="small"
          title="删除"
          sx={{ 
            color: 'text.secondary',
            '&:hover': { color: 'error.main' }
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
