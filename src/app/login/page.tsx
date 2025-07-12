'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Button, 
  Card, 
  Container, 
  TextField, 
  AlertMessage, 
  ThemeToggle 
} from '@/components/MaterialUI'
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper,
  InputAdornment,
  IconButton 
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { useTheme } from '@/contexts/ThemeContext'

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'user' | 'guest'>('user')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { login, loginWithAccessCode } = useAuth()
  const router = useRouter()
  const { mode } = useTheme()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      let result
      if (loginType === 'user') {
        result = await login(username, password)
      } else {
        // 访问码登录不需要用户名，自动生成
        const guestUsername = username || `guest_${Date.now()}`
        result = await loginWithAccessCode(guestUsername, accessCode)
      }

      if (result.success) {
        router.push('/chat')
      } else {
        setError(result.error || '登录失败')
      }
    } catch (error) {
      setError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTogglePassword = () => {
    setShowPassword(!showPassword)
  }

  const handleLoginTypeChange = (_: React.SyntheticEvent, newValue: 'user' | 'guest') => {
    setLoginType(newValue)
    setError('')
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
      p: 2
    }}>
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <ThemeToggle />
      </Box>
      
      <Container maxWidth="sm">
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h2" component="div" sx={{ mb: 2 }}>
            🤖
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
            FimAI Chat
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            登录您的账户
          </Typography>
        </Box>

        <Card sx={{ 
          boxShadow: 3,
          bgcolor: 'background.paper'
        }}>
          <Paper sx={{ borderRadius: '8px 8px 0 0' }}>
            <Tabs
              value={loginType}
              onChange={handleLoginTypeChange}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              sx={{ mb: 3 }}
            >
              <Tab value="user" label="用户登录" />
              <Tab value="guest" label="访问码登录" />
            </Tabs>
          </Paper>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, pb: 3 }}>
            {/* 用户名（根据登录类型显示不同的帮助文字） */}
            <Box sx={{ mb: 3 }}>
              <TextField
                label="用户名"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={loginType === 'user' ? "请输入用户名" : "请输入用户名（可选）"}
                required={loginType === 'user'}
                helperText={loginType === 'guest' ? "可选，留空将自动生成" : ""}
                fullWidth
              />
            </Box>

            {/* 密码（仅用户登录时显示） */}
            {loginType === 'user' && (
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="密码"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleTogglePassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            )}

            {/* 访问码（仅访客登录时显示） */}
            {loginType === 'guest' && (
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="访问码"
                  id="accessCode"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="请输入访问码 (fimai_xxxxxxxxxxxxxxxx)"
                  required
                  fullWidth
                />
              </Box>
            )}

            {/* 错误信息 */}
            {error && (
              <Box sx={{ mb: 3 }}>
                <AlertMessage severity="error">{error}</AlertMessage>
              </Box>
            )}

            {/* 登录按钮 */}
            <Button
              type="submit"
              disabled={isLoading}
              fullWidth
              size="large"
              sx={{ mb: 2 }}
            >
              {isLoading ? '登录中...' : '登录'}
            </Button>
          </Box>
        </Card>

        {/* 其他操作 */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            还没有账户？{' '}
            <Link href="/register" style={{ color: mode === 'light' ? '#212121' : '#fff', fontWeight: 500 }}>
              立即注册
            </Link>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Link href="/" style={{ color: mode === 'light' ? '#212121' : '#fff', fontWeight: 500 }}>
              返回首页
            </Link>
          </Typography>
        </Box>

        {/* 说明 */}
        <Paper sx={{ mt: 4, p: 2, bgcolor: 'background.paper', boxShadow: 1, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            登录说明
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            <li>• 用户登录：使用已注册的用户名登录</li>
            <li>• 访问码登录：使用他人分享的访问码临时登录</li>
            <li>• 访客用户的聊天记录仅保存在本地</li>
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}
