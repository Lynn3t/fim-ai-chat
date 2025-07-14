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
  IconButton,
  Fade,
  Divider
} from '@mui/material'
import { Visibility, VisibilityOff, Login, Person, Key, VpnKey } from '@mui/icons-material'
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
        <Fade in={true} timeout={800}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h2" component="div" sx={{ mb: 2 }}>
              🤖
            </Typography>
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: 'bold', 
              color: 'primary.main', 
              mb: 1,
              letterSpacing: '0.5px' 
            }}>
              FimAI Chat
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              登录您的账户
            </Typography>
          </Box>
        </Fade>

        <Card sx={{ 
          boxShadow: mode === 'light' ? '0 8px 24px rgba(0,0,0,0.12)' : '0 8px 24px rgba(0,0,0,0.4)',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: '8px 8px 0 0',
              borderBottom: 1,
              borderColor: 'divider' 
            }}
          >
            <Tabs
              value={loginType}
              onChange={handleLoginTypeChange}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab 
                value="user" 
                label="用户登录" 
                icon={<Person />} 
                iconPosition="start"
              />
              <Tab 
                value="guest" 
                label="访问码登录" 
                icon={<VpnKey />} 
                iconPosition="start" 
              />
            </Tabs>
          </Paper>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, py: 4 }}>
            {/* 用户名 */}
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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  ),
                }}
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
                    startAdornment: (
                      <InputAdornment position="start">
                        <Key color="action" />
                      </InputAdornment>
                    ),
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
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <VpnKey color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            )}

            {/* 错误信息 */}
            <Fade in={!!error}>
              <Box sx={{ mb: 3 }}>
                <AlertMessage severity="error">{error}</AlertMessage>
              </Box>
            </Fade>

            {/* 登录按钮 */}
            <Button
              type="submit"
              disabled={isLoading}
              fullWidth
              size="large"
              variant="contained"
              sx={{ 
                mb: 2, 
                py: 1.5,
                borderRadius: 8,
                textTransform: 'none',
                fontSize: '1rem'
              }}
              startIcon={<Login />}
            >
              {isLoading ? '登录中...' : '登录'}
            </Button>

            {loginType === 'user' && (
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2">
                  <Link 
                    href="/forgot-password" 
                    style={{ 
                      color: 'primary', 
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    忘记密码？
                  </Link>
                </Typography>
              </Box>
            )}
          </Box>
        </Card>

        {/* 其他操作 */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            还没有账户？{' '}
            <Link 
              href="/register" 
              style={{ 
                color: 'primary',
                fontWeight: 500,
                textDecoration: 'none' 
              }}
            >
              立即注册
            </Link>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Link 
              href="/" 
              style={{ 
                color: 'primary',
                textDecoration: 'none'
              }}
            >
              返回首页
            </Link>
          </Typography>
        </Box>

        {/* 说明 */}
        <Paper 
          elevation={1}
          sx={{ 
            mt: 4, 
            p: 2, 
            bgcolor: mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.05)', 
            borderRadius: 2,
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}>
            登录说明
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li>用户登录：使用已注册的用户名登录 (不区分大小写)</li>
            <li>访问码登录：使用他人分享的访问码临时登录</li>
            <li>访客用户的聊天记录仅保存在本地</li>
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}
