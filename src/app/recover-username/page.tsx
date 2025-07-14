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
  Fade,
} from '@mui/material'
import { 
  Email,
  AccountCircle
} from '@mui/icons-material'
import { useTheme } from '@/contexts/ThemeContext'

export default function RecoverUsernamePage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [recoveredUsername, setRecoveredUsername] = useState('')

  const router = useRouter()
  const { mode } = useTheme()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')
    setRecoveredUsername('')

    if (!email) {
      setError('请输入邮箱地址')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/recover-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('已找到与该邮箱关联的用户名')
        setRecoveredUsername(data.username)
      } else {
        setError(data.error || '未找到与该邮箱关联的用户')
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
              找回用户名
            </Typography>
          </Paper>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, py: 4 }}>
            {/* 邮箱地址输入 */}
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

            {/* 错误信息 */}
            <Fade in={!!error}>
              <Box sx={{ mb: 3 }}>
                <AlertMessage severity="error">{error}</AlertMessage>
              </Box>
            </Fade>

            {/* 成功信息和显示找回的用户名 */}
            <Fade in={!!success}>
              <Box sx={{ mb: 3 }}>
                <AlertMessage severity="success">{success}</AlertMessage>
                {recoveredUsername && (
                  <Box 
                    sx={{ 
                      mt: 2, 
                      p: 2, 
                      border: 1, 
                      borderColor: 'success.light', 
                      borderRadius: 1,
                      bgcolor: 'success.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1
                    }}
                  >
                    <AccountCircle />
                    <Typography variant="subtitle1" fontWeight="bold">
                      {recoveredUsername}
                    </Typography>
                  </Box>
                )}
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
              startIcon={<AccountCircle />}
            >
              {isLoading ? '查找中...' : '查找用户名'}
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
          <Link href="/forgot-password">
            <Typography 
              variant="body2" 
              component="span"
              sx={{ 
                color: 'text.secondary',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              忘记密码？
            </Typography>
          </Link>
        </Box>
      </Container>
    </Box>
  )
} 