'use client'

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, Card, Container, Loading, ThemeToggle } from "@/components/MaterialUI";
import { Typography, Box, Link as MuiLink } from "@mui/material";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { mode } = useTheme();

  useEffect(() => {
    if (!isLoading && user) {
      // 已登录用户重定向到聊天页面
      router.push('/chat')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Loading />
      </Box>
    )
  }

  if (user) {
    return null // 重定向中
  }
  
  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
    }}>
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <ThemeToggle />
      </Box>
      
      <Container maxWidth="sm">
        <Card sx={{ 
          py: 4, 
          px: 3, 
          textAlign: 'center',
          bgcolor: 'background.paper',
          boxShadow: 3,
        }}>
          {/* FimAI Logo */}
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="h2" 
              component="div" 
              sx={{ mb: 2, fontWeight: 'normal' }}
            >
              🤖
            </Typography>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}
            >
              FimAI Chat
            </Typography>
            <Typography 
              variant="subtitle1" 
              color="text.secondary" 
              sx={{ mb: 4 }}
            >
              智能AI聊天平台
            </Typography>
          </Box>

          {/* 登录注册按钮 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              component={Link}
              href="/login"
              fullWidth
              size="large"
            >
              登录
            </Button>
            <Button
              component={Link}
              href="/register"
              fullWidth
              variant="outlined"
              size="large"
            >
              注册账号
            </Button>
          </Box>
        </Card>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            &copy; {new Date().getFullYear()} FimAI - 智能AI聊天平台
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
