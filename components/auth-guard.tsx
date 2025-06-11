"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (!isLoading && !user && !isRedirecting) {
      setIsRedirecting(true)
      router.push("/auth/sign-in")
    }
  }, [user, isLoading, router, isRedirecting])

  // Loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Проверка авторизации...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p>Перенаправление на страницу входа...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Authenticated
  return <>{children}</>
}
