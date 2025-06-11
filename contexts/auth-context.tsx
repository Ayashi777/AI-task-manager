"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { loadAuthState, signIn as authSignIn, signOut as authSignOut, type AuthState } from "@/lib/auth"

interface AuthContextType extends AuthState {
  signIn: (provider: "google" | "github") => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ user: null, isLoading: true })

  useEffect(() => {
    // Load initial auth state
    const initialState = loadAuthState()
    setAuthState(initialState)
  }, [])

  const signIn = async (provider: "google" | "github") => {
    setAuthState((prev) => ({ ...prev, isLoading: true }))
    try {
      const user = await authSignIn(provider)
      setAuthState({ user, isLoading: false })
    } catch (error) {
      console.error("Sign in error:", error)
      setAuthState({ user: null, isLoading: false })
      throw error
    }
  }

  const signOut = async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }))
    try {
      await authSignOut()
      setAuthState({ user: null, isLoading: false })
    } catch (error) {
      console.error("Sign out error:", error)
      setAuthState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  return <AuthContext.Provider value={{ ...authState, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
