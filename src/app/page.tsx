'use client'

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      // 已登录用户重定向到聊天页面
      router.push('/chat')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    return null // 重定向中
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          {/* FimAI Logo */}
          <div className="mb-8">
            <div className="text-8xl mb-4">🤖</div>
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              FimAI Chat
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
              智能AI聊天平台 - 支持多用户管理和多种AI模型
            </p>
          </div>

          {/* 主要功能图标 */}
          <div className="flex justify-center gap-12 mb-12">
            <Link
              href="/login"
              className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">👤</div>
              <span className="text-lg font-medium text-gray-900 dark:text-white">登录</span>
            </Link>
            <Link
              href="/chat"
              className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">💬</div>
              <span className="text-lg font-medium text-gray-900 dark:text-white">聊天</span>
            </Link>
            <Link
              href="/config"
              className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">⚙️</div>
              <span className="text-lg font-medium text-gray-900 dark:text-white">管理</span>
            </Link>
          </div>

          {/* 快速操作 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/login"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
            >
              立即登录
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-lg"
            >
              注册账号
            </Link>
          </div>

          {/* 用户角色说明 */}
          <div className="mt-16 max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              用户角色
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-3">👑</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    管理员
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  拥有最高权限，可以管理用户、分发邀请码、查看系统统计
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-3">👤</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    普通用户
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  可以正常聊天、分发访问码、查看自己的使用统计
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-3">👥</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    访客
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  通过访问码使用指定模型，聊天记录仅本地存储
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
