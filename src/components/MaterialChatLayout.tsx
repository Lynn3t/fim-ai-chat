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
  Avatar
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
  models?: Array<{id: string, name: string}>;
  onModelSelect?: (modelId: string) => void;
  currentModelId?: string;
}

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
                  {/* Group models by provider */}
                  {Object.entries(
                    models.reduce((acc, model) => {
                      // Extract provider name from model name format "ModelName (ProviderName)"
                      const match = model.name.match(/^(.*) \((.*)\)$/);
                      const providerName = match ? match[2] : '其他';
                      
                      if (!acc[providerName]) {
                        acc[providerName] = [];
                      }
                      acc[providerName].push({
                        id: model.id,
                        name: match ? match[1] : model.name
                      });
                      return acc;
                    }, {} as Record<string, Array<{id: string, name: string}>>)
                  ).map(([provider, providerModels]) => (
                    <React.Fragment key={provider}>
                      <ListItem sx={{ py: 0, px: 2 }}>
                        <ListItemText 
                          primary={provider} 
                          primaryTypographyProps={{ 
                            variant: 'caption',
                            color: 'text.secondary',
                            fontWeight: 'bold'
                          }} 
                        />
                      </ListItem>
                      <Divider />
                      {providerModels.map(model => (
                        <MenuItem 
                          key={model.id} 
                          onClick={() => handleModelSelect(model.id)}
                          selected={currentModelId === model.id}
                        >
                          <ListItemText primary={model.name} />
                        </MenuItem>
                      ))}
                      {/* Add divider between provider groups */}
                      <Divider />
                    </React.Fragment>
                  ))}
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
            {messages.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                opacity: 0.7
              }}>
                <Typography variant="h4" gutterBottom>
                  👋 欢迎使用 FimAI Chat
                </Typography>
                <Typography variant="body1" textAlign="center">
                  开始一个新的对话，输入您的问题或指令。
                </Typography>
              </Box>
            ) : (
              messages.map((message) => (
                <Box 
                  key={message.id} 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                    mb: 2,
                    gap: 1
                  }}
                >
                  {/* 头像区域 */}
                  <Avatar 
                    sx={{ 
                      bgcolor: message.role === 'user' 
                        ? (mode === 'light' ? '#212121' : '#e0e0e0') 
                        : (mode === 'light' ? '#9e9e9e' : '#424242'),
                      color: message.role === 'user'
                        ? (mode === 'light' ? '#fff' : '#000')
                        : (mode === 'light' ? '#fff' : '#000'),
                      width: 36,
                      height: 36
                    }}
                  >
                    {message.role === 'user' ? <PersonIcon /> : <SmartToyIcon />}
                  </Avatar>
                  
                  <Box sx={{ maxWidth: '85%' }}>
                    {/* 发送者名称 */}
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 0.5, 
                        textAlign: message.role === 'user' ? 'right' : 'left' 
                      }}
                    >
                      {message.role === 'user' ? userName : (message.modelInfo?.modelName || modelName || 'AI助手')}
                    </Typography>
                    
                    {/* 消息气泡 */}
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 2, 
                        bgcolor: message.role === 'user' 
                          ? (mode === 'light' ? '#e0e0e0' : '#333333') 
                          : (mode === 'light' ? '#ffffff' : '#1e1e1e'),
                        borderRadius: 2
                      }}
                    >
                      {renderMessageContent(message)}
                    </Paper>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* 输入区域 */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box sx={{ 
            maxWidth: { xs: '100%', sm: '80%', md: '800px' }, 
            width: '100%', 
            mx: 'auto' 
          }}>
            <TextField
              fullWidth
              placeholder="输入消息..."
              value={input}
              onChange={onInputChange}
              onKeyPress={onKeyPress}
              disabled={isLoading}
              multiline
              maxRows={4}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={onSend} 
                      disabled={isLoading || !input.trim()}
                      color="primary"
                    >
                      <SendIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}; 