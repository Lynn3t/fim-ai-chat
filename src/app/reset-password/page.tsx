'use client'

import { useState, useEffect } from 'react'
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
  Paper,
  InputAdornment,
  IconButton,
  Fade,
  CircularProgress
} from '@mui/material'
import { 
  Visibility, 
  VisibilityOff, 
  Lock,
  Save,
  CheckCircle
} from '@mui/icons-material'
import { useTheme } from '@/contexts/ThemeContext'
import Logo from '@/components/Logo'

export default function ResetPasswordPage() {
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const { mode } = useTheme()

  useEffect(() => {
    // 从本地存储获取重置令牌
    const token = localStorage.getItem('fimai_reset_token')
    if (!token) {
      setError('无效的重置链接，请重新验证身份')
    } else {
      setResetToken(token)
    }
  }, [])

  const handleTogglePassword = (field: 'password' | 'confirm') => {
    if (field === 'password') {
      setShowPassword(!showPassword)
    } else {
      setShowConfirmPassword(!showConfirmPassword)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!resetToken) {
      setError('无效的重置令牌')
      setIsLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError('密码至少需要6个字符')
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不匹配')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        // 清除本地存储的令牌
        localStorage.removeItem('fimai_reset_token')
        // 3秒后重定向到登录页面
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(data.error || '密码重置失败')
      }
    } catch (error) {
      setError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
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
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Logo size={80} />
            </Box>
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: 'bold', 
              color: 'primary.main', 
              mb: 1,
              letterSpacing: '0.5px' 
            }}>
              FimAI Chat
            </Typography>
          </Box>
        </Fade>

        {success ? (
          <Card sx={{ 
            boxShadow: mode === 'light' ? '0 8px 24px rgba(0,0,0,0.12)' : '0 8px 24px rgba(0,0,0,0.4)',
            bgcolor: 'background.paper',
            borderRadius: 2,
            p: 4,
            textAlign: 'center'
          }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2 }}>密码重置成功！</Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              您的密码已成功更新，正在跳转到登录页面...
            </Typography>
            <CircularProgress size={24} sx={{ mb: 2 }} />
          </Card>
        ) : (
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
                borderColor: 'divider',
                p: 2,
                textAlign: 'center'
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                设置新密码
              </Typography>
            </Paper>
            
            <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, py: 4 }}>
              {/* 新密码 */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="新密码"
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码"
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => handleTogglePassword('password')}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* 确认新密码 */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="确认新密码"
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => handleTogglePassword('confirm')}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* 错误信息 */}
              <Fade in={!!error}>
                <Box sx={{ mb: 3 }}>
                  <AlertMessage severity="error">{error}</AlertMessage>
                </Box>
              </Fade>

              {/* 提交按钮 */}
              <Button
                type="submit"
                disabled={isLoading || !resetToken}
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
                startIcon={<Save />}
              >
                {isLoading ? '正在保存...' : '保存新密码'}
              </Button>

              {/* 返回登录 */}
              <Box sx={{ textAlign: 'center' }}>
                <Link href="/login">
                  <Typography 
                    variant="body2" 
                    component="span"
                    sx={{ 
                      color: 'primary.main',
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' }
                    }}
                  >
                    返回登录
                  </Typography>
                </Link>
              </Box>
            </Box>
          </Card>
        )}
      </Container>
    </Box>
  )
} 