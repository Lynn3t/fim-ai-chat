'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminConfig from '@/components/AdminConfig';
import UserConfig from '@/components/UserConfig';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Button, 
  IconButton, 
  Avatar, 
  Paper, 
  Container,
  Chip
} from '@mui/material';
import { 
  Logout as LogoutIcon, 
  Chat as ChatIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { ThemeToggle } from '@/components/MaterialUI';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

function ConfigPageContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { mode } = useTheme();

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      router.push('/login');
    }
  };

  if (!user) {
    return null; // Loading is handled by ProtectedRoute
  }

  const getRoleLabel = () => {
    switch(user.role) {
      case 'ADMIN': return '管理员';
      case 'USER': return '用户';
      default: return '访客';
    }
  };

  const getRoleColor = () => {
    switch(user.role) {
      case 'ADMIN': return 'error';
      case 'USER': return 'primary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: mode === 'light' ? 'background.default' : 'background.default',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 顶部导航栏 */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            onClick={() => router.push('/chat')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            FimAI Chat - 配置中心
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ThemeToggle />
            
            <Button
              component={Link}
              href="/chat"
              startIcon={<ChatIcon />}
              variant="outlined"
              color="inherit"
              size="small"
            >
              聊天
            </Button>
            
            <Chip 
              avatar={
                <Avatar sx={{ bgcolor: mode === 'light' ? 'primary.main' : 'primary.dark' }}>
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              }
              label={user.username}
              variant="outlined"
              color={getRoleColor()}
              sx={{ mr: 1 }}
            />
            
            <Button
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              variant="contained"
              color="error"
              size="small"
            >
              退出
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 主要内容区域 */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        {/* 根据用户角色显示不同的配置界面 */}
        {user.role === 'ADMIN' ? (
          <AdminConfig />
        ) : user.role === 'USER' ? (
          <UserConfig />
        ) : (
          // 访客用户重定向到聊天页面
          <Box sx={{ 
            height: '70vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 'sm' }}>
              <Typography variant="h5" component="h2" gutterBottom>
                访客用户无法访问配置页面
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                访客用户只能使用聊天功能
              </Typography>
              <Button
                component={Link}
                href="/chat"
                variant="contained"
                color="primary"
                size="large"
              >
                前往聊天
              </Button>
            </Paper>
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default function ConfigPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ConfigPageContent />
    </ProtectedRoute>
  );
}
