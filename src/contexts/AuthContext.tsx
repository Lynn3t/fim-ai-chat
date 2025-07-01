'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface User {
  id: string
  username: string
  email?: string
  role: 'ADMIN' | 'USER' | 'GUEST'
  isActive: boolean
  canShareAccessCode: boolean
  hostUserId?: string
  createdAt: string
}

export interface ChatConfig {
  role: string
  canSaveToDatabase: boolean
  allowedModels: string[]
  tokenLimit?: number
  tokenUsed?: number
  hostUserId?: string
}

interface AuthContextType {
  user: User | null
  chatConfig: ChatConfig | null
  isLoading: boolean
  login: (username: string) => Promise<{ success: boolean; error?: string }>
  loginWithAccessCode: (username: string, accessCode: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshChatConfig: () => Promise<void>
}

interface RegisterData {
  username: string
  email?: string
  inviteCode?: string
  accessCode?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [chatConfig, setChatConfig] = useState<ChatConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 从localStorage恢复用户状态
  useEffect(() => {
    // 初始化系统设置
    const initializeSystem = async () => {
      try {
        await fetch('/api/init', { method: 'POST' })
      } catch (error) {
        console.error('Failed to initialize system:', error)
      }
    }

    initializeSystem()

    const savedUser = localStorage.getItem('fimai_user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        // 获取聊天配置
        fetchChatConfig(userData.id)
      } catch (error) {
        console.error('Failed to parse saved user:', error)
        localStorage.removeItem('fimai_user')
      }
    }
    setIsLoading(false)
  }, [])

  const fetchChatConfig = async (userId: string) => {
    try {
      const response = await fetch(`/api/chat/permissions?userId=${userId}&action=config`)
      if (response.ok) {
        const config = await response.json()
        setChatConfig(config)
      }
    } catch (error) {
      console.error('Failed to fetch chat config:', error)
    }
  }

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        setChatConfig(data.chatConfig)
        localStorage.setItem('fimai_user', JSON.stringify(data.user))
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Login failed' }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const loginWithAccessCode = async (username: string, accessCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, accessCode }),
      })

      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        await fetchChatConfig(data.user.id)
        localStorage.setItem('fimai_user', JSON.stringify(data.user))
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Access code login failed' }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success && result.user) {
        setUser(result.user)
        await fetchChatConfig(result.user.id)
        localStorage.setItem('fimai_user', JSON.stringify(result.user))
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Registration failed' }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const logout = () => {
    setUser(null)
    setChatConfig(null)
    localStorage.removeItem('fimai_user')
  }

  const refreshChatConfig = async () => {
    if (user) {
      await fetchChatConfig(user.id)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        chatConfig,
        isLoading,
        login,
        loginWithAccessCode,
        register,
        logout,
        refreshChatConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
