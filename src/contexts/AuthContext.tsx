'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User, ChatConfig, RegisterData } from '@/types'

interface AuthContextType {
  user: User | null
  chatConfig: ChatConfig | null
  isLoading: boolean
  token: string | null
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginWithAccessCode: (username: string, accessCode: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshChatConfig: () => Promise<void>
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [chatConfig, setChatConfig] = useState<ChatConfig | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 从localStorage恢复用户状态
  useEffect(() => {
    let isMounted = true;

    // 初始化系统设置（只在首次加载时执行）
    const initializeSystem = async () => {
      try {
        // 检查是否已经初始化过
        const initialized = sessionStorage.getItem('fimai_initialized');
        if (!initialized) {
          await fetch('/api/init', { method: 'POST' });
          sessionStorage.setItem('fimai_initialized', 'true');
        }
      } catch (error) {
        console.error('Failed to initialize system:', error);
      }
    };

    const loadUserData = async () => {
      await initializeSystem();

      if (!isMounted) return;

      const savedUser = localStorage.getItem('fimai_user');
      const savedToken = localStorage.getItem('fimai_token');
      if (savedUser && savedToken) {
        try {
          const userData = JSON.parse(savedUser);
          if (isMounted) {
            setUser(userData);
            setToken(savedToken);
            // 获取聊天配置
            await fetchChatConfig();
          }
        } catch (error) {
          console.error('Failed to parse saved user:', error);
          localStorage.removeItem('fimai_user');
          localStorage.removeItem('fimai_token');
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [])

  // 带认证的fetch函数
  const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 401 未授权时自动清除状态并重定向到主页
    if (response.status === 401) {
      localStorage.removeItem('fimai_user');
      localStorage.removeItem('fimai_token');
      setUser(null);
      setToken(null);
      setChatConfig(null);
      window.location.href = '/';
    }

    return response;
  };

  const fetchChatConfig = async () => {
    if (!token) return;
    
    try {
      const response = await authenticatedFetch('/api/chat/permissions?action=config');
      if (response.ok) {
        const config = await response.json();
        setChatConfig(config);
      } else if (response.status === 401 || response.status === 500) {
        // Token无效或用户不存在，清除本地存储
        console.warn('Authentication failed or user not found, clearing local storage');
        localStorage.removeItem('fimai_user');
        localStorage.removeItem('fimai_token');
        setUser(null);
        setToken(null);
        setChatConfig(null);
      }
    } catch (error) {
      console.error('Failed to fetch chat config:', error);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (data.success && data.user && data.token) {
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem('fimai_user', JSON.stringify(data.user))
        localStorage.setItem('fimai_token', data.token)
        
        // 获取聊天配置
        await fetchChatConfig()
        
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

      if (data.success && data.user && data.token) {
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem('fimai_user', JSON.stringify(data.user))
        localStorage.setItem('fimai_token', data.token)

        // 获取聊天配置
        await fetchChatConfig()

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

      if (result.success && result.user && result.token) {
        setUser(result.user)
        setToken(result.token)
        localStorage.setItem('fimai_user', JSON.stringify(result.user))
        localStorage.setItem('fimai_token', result.token)

        // 获取聊天配置
        await fetchChatConfig()

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
    setToken(null)
    setChatConfig(null)
    localStorage.removeItem('fimai_user')
    localStorage.removeItem('fimai_token')
  }

  const refreshChatConfig = async () => {
    if (token) {
      await fetchChatConfig()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        chatConfig,
        isLoading,
        token,
        login,
        loginWithAccessCode,
        register,
        logout,
        refreshChatConfig,
        authenticatedFetch,
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
