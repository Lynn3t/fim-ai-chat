'use client'

import { useState, useEffect } from 'react'
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
  Paper,
  InputAdornment,
  IconButton,
  CircularProgress,
  Tooltip,
  Fade,
  Divider
} from '@mui/material'
import { 
  Visibility, 
  VisibilityOff, 
  CheckCircleOutline, 
  Cancel,
  PersonAdd,
  Email,
  Key,
  VpnKey
} from '@mui/icons-material'
import { useTheme } from '@/contexts/ThemeContext'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    inviteCode: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [inviteCodeStatus, setInviteCodeStatus] = useState<'valid' | 'invalid' | null>(null)
  const [hasAdmin, setHasAdmin] = useState(true) // 默认假设已有管理员

  const { register } = useAuth()
  const router = useRouter()
  const { mode } = useTheme()

  // 检查是否已有管理员
  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        const response = await fetch('/api/system/admin-exists')
        if (response.ok) {
          const data = await response.json()
          setHasAdmin(data.hasAdmin)
        }
      } catch (error) {
        console.error('检查管理员状态失败:', error)
      }
    }

    checkAdminExists()
  }, [])

  const validateInviteCode = async (code: string) => {
    if (!code || code.length < 10) {
      setInviteCodeStatus(null)
      return
    }

    setIsValidating(true)
    try {
      const response = await fetch(`/api/codes/invite?code=${encodeURIComponent(code)}`)
      const result = await response.json()
      setInviteCodeStatus(result.valid ? 'valid' : 'invalid')
      if (!result.valid) {
        setError(result.error || '邀请码无效')
      } else {
        setError('')
      }
    } catch (error) {
      setInviteCodeStatus('invalid')
      setError('验证邀请码时出错')
    } finally {
      setIsValidating(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (name === 'inviteCode') {
      // 延迟验证邀请码
      setTimeout(() => validateInviteCode(value), 500)
    }
  }

  const handleTogglePassword = () => {
    setShowPassword(!showPassword)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!hasAdmin && !formData.inviteCode) {
      // 如果是首个管理员，可以跳过邀请码验证
    } else if (inviteCodeStatus !== 'valid') {
      setError('请输入有效的邀请码')
      setIsLoading(false)
      return
    }

    if (!formData.password || formData.password.length < 6) {
      setError('密码至少需要6位字符')
      setIsLoading(false)
      return
    }

    try {
      const result = await register({
        username: formData.username,
        email: formData.email || undefined,
        password: formData.password,
        inviteCode: formData.inviteCode,
      })

      if (result.success) {
        router.push('/chat')
      } else {
        setError(result.error || '注册失败')
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

        {/* 注册表单 */}
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
              注册账户
            </Typography>
          </Paper>

          <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, py: 4 }}>
            {/* 用户名 */}
            <Box sx={{ mb: 3 }}>
              <TextField
                label="用户名"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="请输入用户名"
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonAdd color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* 邮箱 */}
            <Box sx={{ mb: 3 }}>
              <TextField
                label="邮箱"
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="请输入邮箱地址"
                helperText="重置密码需要"
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

            {/* 密码 */}
            <Box sx={{ mb: 3 }}>
              <TextField
                label="密码"
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="请输入密码"
                required
                helperText="密码至少6位字符"
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

            {/* 邀请码 */}
            <Box sx={{ mb: 3 }}>
              <TextField
                label="邀请码"
                id="inviteCode"
                name="inviteCode"
                value={formData.inviteCode}
                onChange={handleInputChange}
                placeholder="请输入邀请码 (fimai_xxxxxxxxxxxxxxxx)"
                required={hasAdmin}
                fullWidth
                error={inviteCodeStatus === 'invalid'}
                color={inviteCodeStatus === 'valid' ? 'success' : undefined}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VpnKey color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {isValidating && <CircularProgress size={20} />}
                      {!isValidating && inviteCodeStatus === 'valid' && (
                        <Tooltip title="邀请码有效">
                          <CheckCircleOutline color="success" />
                        </Tooltip>
                      )}
                      {!isValidating && inviteCodeStatus === 'invalid' && (
                        <Tooltip title="邀请码无效">
                          <Cancel color="error" />
                        </Tooltip>
                      )}
                    </InputAdornment>
                  ),
                }}
                helperText={!hasAdmin ? '首个管理员注册不需要邀请码' : ''}
              />
            </Box>

            {/* 错误信息 */}
            <Fade in={!!error}>
              <Box sx={{ mb: 3 }}>
                <AlertMessage severity="error">{error}</AlertMessage>
              </Box>
            </Fade>

            {/* 注册按钮 */}
            <Button
              type="submit"
              disabled={isLoading || (hasAdmin && inviteCodeStatus !== 'valid')}
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
              startIcon={<PersonAdd />}
            >
              {isLoading ? '注册中...' : '注册账户'}
            </Button>
          </Box>
        </Card>

        {/* 其他操作 */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            已有账户？{' '}
            <Link 
              href="/login" 
              style={{ 
                color: 'primary',
                fontWeight: 500,
                textDecoration: 'none' 
              }}
            >
              立即登录
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
            注册说明
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li>需要邀请码才能注册，请联系管理员获取</li>
            <li>用户名不区分大小写，请使用字母、数字组合</li>
            <li>邮箱地址用于密码找回，强烈建议设置</li>
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}
