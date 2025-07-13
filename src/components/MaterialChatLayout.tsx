'use client';

import React, { ReactNode } from 'react';
import { 
  Box, 
  Paper, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemButton,
  ListItemIcon,
  Divider,
  TextField,
  InputAdornment,
  Tooltip,
  Menu,
  MenuItem,
  Avatar,
  Button
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Send as SendIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material';
import { ThemeToggle } from './MaterialUI';
import { useTheme } from '@/contexts/ThemeContext';
import { sortGroupsByUserOrder, getModelGroups } from '@/utils/aiModelUtils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  modelInfo?: {
    modelId: string;
    modelName: string;
    providerId: string;
    providerName: string;
  };
}

interface ChatHistory {
  id: string;
  title: string;
}

interface MaterialChatLayoutProps {
  title?: string;
  chatHistories: ChatHistory[];
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  onLogout?: () => void;
  onSettings?: () => void;
  renderMessageContent: (message: ChatMessage) => ReactNode;
  modelName?: string;
  providerName?: string;
  userName?: string;
  models?: Array<{
    id: string, 
    name: string,
    group?: string,
    provider?: string
  }>;
  modelGroups?: Array<{ groupName: string; order: number }>;
  onModelSelect?: (modelId: string) => void;
  currentModelId?: string;
}

// 使用中性黑白配色
const DRAWER_WIDTH = 280;

export const MaterialChatLayout: React.FC<MaterialChatLayoutProps> = ({
  title = 'FimAI Chat',
  chatHistories,
  messages,
  input,
  isLoading,
  onInputChange,
  onSend,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onKeyPress,
  onLogout,
  onSettings,
  renderMessageContent,
  modelName,
  providerName,
  userName = '用户',
  models = [],
  modelGroups = [],
  onModelSelect,
  currentModelId
}) => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [modelMenuAnchorEl, setModelMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const { mode } = useTheme();
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleModelMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setModelMenuAnchorEl(event.currentTarget);
  };

  const handleModelMenuClose = () => {
    setModelMenuAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleSettings = () => {
    handleMenuClose();
    if (onSettings) onSettings();
  };

  const handleLogout = () => {
    handleMenuClose();
    if (onLogout) onLogout();
  };

  const handleModelSelect = (modelId: string) => {
    if (onModelSelect) {
      onModelSelect(modelId);
      handleModelMenuClose();
    }
  };

  // 抽屉内容
  const drawer = (
    <>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div">
          会话列表
        </Typography>
        <IconButton edge="end" color="inherit" onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Box 
          onClick={onNewChat}
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 1.5,
            border: '1px dashed',
            borderColor: 'text.secondary',
            borderRadius: 1,
            cursor: 'pointer',
            mb: 2,
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
        >
          <AddIcon sx={{ mr: 1 }} />
          <Typography>新建会话</Typography>
        </Box>
      </Box>
      <List sx={{ overflow: 'auto', flexGrow: 1 }}>
        {chatHistories.map((chat) => (
          <ListItem 
            key={chat.id}
            disablePadding
            secondaryAction={
              <IconButton 
                edge="end" 
                onClick={(e) => { 
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemButton onClick={() => onSelectChat(chat.id)}>
              <ListItemIcon>
                <HistoryIcon />
              </ListItemIcon>
              <ListItemText 
                primary={chat.title || '新会话'} 
                primaryTypographyProps={{ 
                  noWrap: true,
                  sx: { maxWidth: '160px' }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <ThemeToggle />
      </Box>
    </>
  );

  // 获取带有自定义分组的模型数据
  const getGroupedModels = () => {
    // 首先按分组归类模型
    const modelsByGroup: Record<string, Array<{id: string, name: string, provider?: string}>> = {};
    
    models.forEach(model => {
      const groupName = model.group || '其他';
      if (!modelsByGroup[groupName]) {
        modelsByGroup[groupName] = [];
      }
      modelsByGroup[groupName].push({
        id: model.id,
        name: model.name,
        provider: model.provider
      });
    });
    
    // 使用用户自定义排序对分组进行排序
    const sortedGroups = sortGroupsByUserOrder(modelsByGroup, modelGroups);
    
    return sortedGroups.map(groupName => ({
      groupName,
      models: modelsByGroup[groupName]
    }));
  };

  const groupedModels = getGroupedModels();

  // 消息展示区域
  const messagesList = (
    <Box 
      sx={{ 
        flexGrow: 1, 
        p: 2, 
        overflowY: 'auto',
        display: 'flex', 
        flexDirection: 'column',
        gap: 2
      }}
    >
      {messages.length === 0 && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          opacity: 0.7
        }}>
          <Typography variant="h5" component="div" sx={{ mb: 2, color: 'text.primary' }}>
            开始新的对话
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            选择模型并输入您的问题开始聊天
          </Typography>
        </Box>
      )}
      
      {messages.map((message) => (
        <Paper
          key={message.id}
          elevation={0}
          sx={{
            p: 2,
            backgroundColor: message.role === 'user' ? 'background.default' : 'background.paper',
            borderRadius: 2,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: message.role === 'user' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.23)',
            color: 'text.primary',
            maxWidth: '100%'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
            {message.role === 'assistant' ? (
              <Avatar sx={{ 
                mr: 1, 
                bgcolor: 'transparent',
                color: 'text.primary',
                border: 1,
                borderColor: 'divider'
              }}>
                <SmartToyIcon />
              </Avatar>
            ) : (
              <Avatar sx={{ 
                mr: 1,
                bgcolor: 'transparent',
                color: 'text.primary',
                border: 1,
                borderColor: 'divider'
              }}>
                <PersonIcon />
              </Avatar>
            )}
            <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
              {message.role === 'user' ? userName : (
                message.modelInfo?.modelName ? 
                `${message.modelInfo.modelName}` : 
                modelName || 'AI'
              )}
            </Typography>
          </Box>
          {renderMessageContent(message)}
        </Paper>
      ))}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* 侧边栏抽屉 */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: 'block' },
          '& .MuiDrawer-paper': { 
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* 主内容区 */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flexGrow: 1, 
        overflow: 'hidden',
        height: '100%'
      }}>
        {/* 顶部应用栏 */}
        <AppBar 
          position="static" 
          color="default" 
          sx={{ 
            bgcolor: mode === 'light' ? 'background.paper' : 'background.default',
            boxShadow: 1
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            
            <Typography variant="h6" component="div" sx={{ mr: 2 }}>
              {title}
            </Typography>
            
            {/* 模型选择器 */}
            {models.length > 0 && (
              <>
                <Box 
                  onClick={handleModelMenuOpen}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    py: 0.5,
                    px: 1.5,
                    mr: 2
                  }}
                >
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    {modelName || '选择模型'}
                  </Typography>
                  <SmartToyIcon fontSize="small" />
                </Box>
                <Menu
                  id="model-menu"
                  anchorEl={modelMenuAnchorEl}
                  keepMounted
                  open={Boolean(modelMenuAnchorEl)}
                  onClose={handleModelMenuClose}
                  PaperProps={{
                    style: {
                      maxHeight: 400,
                      width: 250,
                    },
                  }}
                >
                  {groupedModels.map(({groupName, models: groupModels}) => {
                    return (
                      <div key={groupName}>
                        <ListItem sx={{ py: 0, px: 2 }}>
                          <ListItemText 
                            primary={groupName} 
                            primaryTypographyProps={{ 
                              variant: 'caption',
                              color: 'text.secondary',
                              fontWeight: 'bold'
                            }} 
                          />
                        </ListItem>
                        <Divider />
                        {groupModels.map(model => (
                          <MenuItem 
                            key={model.id} 
                            onClick={() => handleModelSelect(model.id)}
                            selected={currentModelId === model.id}
                          >
                            <ListItemText 
                              primary={model.name} 
                              secondary={model.provider ? `(${model.provider})` : undefined}
                            />
                          </MenuItem>
                        ))}
                        {/* Add divider between groups */}
                        <Divider />
                      </div>
                    );
                  })}
                </Menu>
              </>
            )}
            
            <Box sx={{ flexGrow: 1 }} />
            
            {(modelName || providerName) && (
              <Tooltip title={`模型: ${modelName || 'Unknown'} | 提供商: ${providerName || 'Unknown'}`}>
                <Box
                  sx={{
                    mr: 2,
                    px: 1.5,
                    py: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    display: { xs: 'none', sm: 'block' }
                  }}
                >
                  {modelName || 'Unknown'}
                </Box>
              </Tooltip>
            )}
            <IconButton
              aria-label="more"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              {onSettings && (
                <MenuItem onClick={handleSettings}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>设置</ListItemText>
                </MenuItem>
              )}
              {onLogout && (
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>退出登录</ListItemText>
                </MenuItem>
              )}
            </Menu>
          </Toolbar>
        </AppBar>

        {/* 消息区域 */}
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          p: 2,
          bgcolor: mode === 'light' ? '#f5f5f5' : '#121212',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box sx={{ 
            maxWidth: { xs: '100%', sm: '80%', md: '800px' }, 
            width: '100%', 
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {messagesList}
          </Box>

          {/* 输入框区域 */}
          <Box sx={{ 
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper'
          }}>
            {/* 模型选择区 */}
            <Box sx={{ 
              mb: 1, 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Button 
                onClick={handleModelMenuOpen}
                variant="outlined"
                size="small"
                sx={{
                  color: 'text.primary',
                  borderColor: 'divider',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    borderColor: 'rgba(0, 0, 0, 0.5)'
                  }
                }}
              >
                {modelName || '选择模型'} {providerName && `(${providerName})`}
              </Button>
            </Box>

            <TextField
              fullWidth
              placeholder="输入消息..."
              variant="outlined"
              value={input}
              onChange={onInputChange}
              onKeyPress={onKeyPress}
              disabled={isLoading}
              multiline
              minRows={1}
              maxRows={4}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={onSend} 
                      disabled={isLoading || !input.trim()}
                      sx={{
                        color: 'text.secondary',
                        '&.Mui-disabled': {
                          color: 'rgba(0, 0, 0, 0.26)'
                        }
                      }}
                    >
                      {isLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                            ...
                          </Typography>
                        </Box>
                      ) : <SendIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  backgroundColor: 'background.default',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'text.primary'
                  },
                  '&.Mui-focused': {
                    borderColor: 'text.primary',
                    boxShadow: 'none'
                  }
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderColor: 'divider',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'text.primary'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'text.primary',
                    borderWidth: 1
                  }
                }
              }}
            />
          </Box>

          {/* 模型选择菜单 */}
          <Menu
            anchorEl={modelMenuAnchorEl}
            open={Boolean(modelMenuAnchorEl)}
            onClose={handleModelMenuClose}
            sx={{
              '& .MuiPaper-root': {
                backgroundColor: 'background.paper',
                borderRadius: 1,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                maxHeight: '70vh',
                maxWidth: 320
              }
            }}
          >
            {groupedModels.map((group) => (
              <React.Fragment key={group.groupName}>
                <MenuItem 
                  disabled
                  sx={{ 
                    opacity: 1,
                    fontWeight: 'bold',
                    color: 'text.primary',
                    backgroundColor: 'background.default',
                    borderBottom: 1,
                    borderColor: 'divider'
                  }}
                >
                  {group.groupName}
                </MenuItem>
                
                {group.models.map((model) => (
                  <MenuItem 
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    selected={currentModelId === model.id}
                    sx={{
                      pl: 3,
                      minHeight: '40px',
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(0, 0, 0, 0.08)'
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    {model.name}
                  </MenuItem>
                ))}
              </React.Fragment>
            ))}
          </Menu>
        </Box>
      </Box>
    </Box>
  );
}; 