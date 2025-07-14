'use client'

import { useState } from 'react'
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
  Divider,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio
} from '@mui/material'
import { 
  Visibility, 
  VisibilityOff, 
  Lock, 
  Person, 
  Email,
  Key,
  LockReset
} from '@mui/icons-material'
import { useTheme } from '@/contexts/ThemeContext'

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('')
  const [verificationMethod, setVerificationMethod] = useState<'password' | 'email'>('email')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const router = useRouter()
  const { mode } = useTheme()

  const handleTogglePassword = () => {
    setShowPassword(!showPassword)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (!username) {
      setError('请输入用户名')
      setIsLoading(false)
      return
    }

    if (verificationMethod === 'password' && !password) {
      setError('请输入原密码')
      setIsLoading(false)
      return
    }

    if (verificationMethod === 'email' && !email) {
      setError('请输入邮箱地址')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          verificationType: verificationMethod,
          password: verificationMethod === 'password' ? password : undefined,
          email: verificationMethod === 'email' ? email : undefined
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('验证成功，请设置新密码')
        // 保存重置令牌并跳转到重置密码页面
        localStorage.setItem('fimai_reset_token', data.resetToken)
        router.push('/reset-password')
      } else {
        setError(data.error || '验证失败')
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
              borderColor: 'divider',
              p: 2,
              textAlign: 'center'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              重置密码
            </Typography>
          </Paper>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, py: 4 }}>
            {/* 用户名 */}
            <Box sx={{ mb: 3 }}>
              <TextField
                label="用户名"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                required
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

            {/* 验证方式选择 */}
            <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                验证方式
              </Typography>
              <RadioGroup
                row
                value={verificationMethod}
                onChange={(e) => setVerificationMethod(e.target.value as 'password' | 'email')}
              >
                <FormControlLabel 
                  value="email" 
                  control={<Radio />} 
                  label="使用邮箱验证" 
                  sx={{ flexGrow: 1 }}
                />
                <FormControlLabel 
                  value="password" 
                  control={<Radio />} 
                  label="使用原密码验证" 
                  sx={{ flexGrow: 1 }}
                />
              </RadioGroup>
            </FormControl>

            {/* 根据验证方式显示不同输入框 */}
            {verificationMethod === 'password' ? (
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="原密码"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入原密码"
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
            ) : (
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="邮箱地址"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入注册时的邮箱地址"
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
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

            {/* 成功信息 */}
            <Fade in={!!success}>
              <Box sx={{ mb: 3 }}>
                <AlertMessage severity="success">{success}</AlertMessage>
              </Box>
            </Fade>

            {/* 提交按钮 */}
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
              startIcon={<LockReset />}
            >
              {isLoading ? '验证中...' : '验证身份'}
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

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link href="/recover-username">
            <Typography 
              variant="body2" 
              component="span"
              sx={{ 
                color: 'text.secondary',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              忘记用户名？
            </Typography>
          </Link>
        </Box>
      </Container>
    </Box>
  )
} 