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
  Tooltip
} from '@mui/material'
import { 
  Visibility, 
  VisibilityOff, 
  CheckCircleOutline, 
  Cancel 
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
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h2" component="div" sx={{ mb: 2 }}>
            🤖
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
            FimAI Chat
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            创建您的账户
          </Typography>
        </Box>

        {/* 注册表单 */}
        <Card sx={{ 
          boxShadow: 3,
          bgcolor: 'background.paper'
        }}>
          <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
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
                  endAdornment: (
                    <InputAdornment position="end">
                      {isValidating ? (
                        <CircularProgress size={20} />
                      ) : inviteCodeStatus === 'valid' ? (
                        <Tooltip title="邀请码有效">
                          <CheckCircleOutline color="success" />
                        </Tooltip>
                      ) : inviteCodeStatus === 'invalid' ? (
                        <Tooltip title="邀请码无效">
                          <Cancel color="error" />
                        </Tooltip>
                      ) : null}
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* 错误信息 */}
            {error && (
              <Box sx={{ mb: 3 }}>
                <AlertMessage severity="error">{error}</AlertMessage>
              </Box>
            )}

            {/* 注册按钮 */}
            <Button
              type="submit"
              disabled={isLoading || (hasAdmin && inviteCodeStatus !== 'valid')}
              fullWidth
              size="large"
              sx={{ mb: 2 }}
            >
              {isLoading ? '注册中...' : '注册'}
            </Button>
          </Box>
        </Card>

        {/* 其他操作 */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            已有账户？{' '}
            <Link href="/login" style={{ color: mode === 'light' ? '#212121' : '#fff', fontWeight: 500 }}>
              立即登录
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
            注册说明
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            <li>• 用户名和密码为必填项</li>
            <li>• 邮箱用于找回密码，建议填写</li>
            <li>• 邀请码必须是有效的系统生成码</li>
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}
