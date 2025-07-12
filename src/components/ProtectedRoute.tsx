'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'

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
  const [mounted, setMounted] = useState(false)
  
  // Only render content client-side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isLoading && mounted) {
      if (requireAuth && !user) {
        router.push(redirectTo)
        return
      }

      if (user && !allowedRoles.includes(user.role)) {
        router.push('/unauthorized')
        return
      }
    }
  }, [user, isLoading, requireAuth, allowedRoles, redirectTo, router, mounted])

  // During SSR or before mounting, render a placeholder with same structure
  if (!mounted) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        <CircularProgress size={64} />
      </Box>
    )
  }

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        <CircularProgress size={64} />
      </Box>
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
