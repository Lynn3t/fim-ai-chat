'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  allowedRoles?: ('ADMIN' | 'USER' | 'GUEST')[]
  redirectTo?: string
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  allowedRoles = ['ADMIN', 'USER', 'GUEST'],
  redirectTo = '/'
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !user) {
        router.push(redirectTo)
        return
      }

      if (user && !allowedRoles.includes(user.role)) {
        router.push('/unauthorized')
        return
      }
    }
  }, [user, isLoading, requireAuth, allowedRoles, redirectTo, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (requireAuth && !user) {
    return null
  }

  if (user && !allowedRoles.includes(user.role)) {
    return null
  }

  return <>{children}</>
}
