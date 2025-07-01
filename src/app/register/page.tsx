'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    inviteCode: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [inviteCodeStatus, setInviteCodeStatus] = useState<'valid' | 'invalid' | null>(null)
  const [hasAdmin, setHasAdmin] = useState(true) // 默认假设已有管理员

  const { register } = useAuth()
  const router = useRouter()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (inviteCodeStatus !== 'valid') {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            FimAI Chat
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            创建您的账户
          </p>
        </div>

        {/* 注册表单 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 用户名 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="请输入用户名"
                required
              />
            </div>

            {/* 邮箱 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                邮箱 <span className="text-gray-400">(重置密码需要)</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="请输入邮箱地址"
              />
            </div>

            {/* 密码 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="请输入密码"
                required
                minLength={6}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                密码至少6位字符
              </p>
            </div>

            {/* 邀请码 */}
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                邀请码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="inviteCode"
                  name="inviteCode"
                  value={formData.inviteCode}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    inviteCodeStatus === 'valid'
                      ? 'border-green-300 dark:border-green-600'
                      : inviteCodeStatus === 'invalid'
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="请输入邀请码 (fimai_xxxxxxxxxxxxxxxx)"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {isValidating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  ) : inviteCodeStatus === 'valid' ? (
                    <span className="text-green-500">✓</span>
                  ) : inviteCodeStatus === 'invalid' ? (
                    <span className="text-red-500">✗</span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 错误信息 */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* 注册按钮 */}
            <button
              type="submit"
              disabled={isLoading || inviteCodeStatus !== 'valid'}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? '注册中...' : '注册'}
            </button>
          </form>
        </div>

        {/* 其他操作 */}
        <div className="text-center space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            已有账户？{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              立即登录
            </Link>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              返回首页
            </Link>
          </div>
        </div>

        {/* 说明 */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            注册说明
          </h3>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• 需要有效的邀请码才能注册</li>
            {!hasAdmin && (
              <li>• 管理员邀请码：<code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">fimai_ADMIN_MASTER_KEY</code>（首次注册管理员）</li>
            )}
            <li>• 普通用户邀请码由管理员或其他用户分发</li>
            <li>• 邮箱为可选项，用于找回账户</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
