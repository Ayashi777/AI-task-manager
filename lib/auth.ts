"use client"

export interface User {
  id: string
  name: string
  email: string
  image?: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
}

// Simple in-memory auth state
let authState: AuthState = {
  user: null,
  isLoading: false,
}

const AUTH_STORAGE_KEY = "taskTracker_auth"

// Load user from localStorage
export function loadAuthState(): AuthState {
  if (typeof window === "undefined") {
    return { user: null, isLoading: true }
  }

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      const user = JSON.parse(stored)
      authState = { user, isLoading: false }
      return authState
    }
  } catch (error) {
    console.error("Error loading auth state:", error)
  }

  return { user: null, isLoading: false }
}

// Save user to localStorage
export function saveAuthState(user: User | null) {
  authState = { user, isLoading: false }

  if (typeof window !== "undefined") {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }
}

// Simple sign in function
export function signIn(provider: "google" | "github"): Promise<User> {
  return new Promise((resolve) => {
    // Simulate OAuth flow with mock data
    setTimeout(() => {
      const mockUser: User = {
        id: `${provider}_${Date.now()}`,
        name: provider === "google" ? "Google User" : "GitHub User",
        email: `user@${provider}.com`,
        image: `https://ui-avatars.com/api/?name=${provider === "google" ? "Google+User" : "GitHub+User"}&background=random`,
      }

      saveAuthState(mockUser)
      resolve(mockUser)
    }, 1000)
  })
}

// Sign out function
export function signOut(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      saveAuthState(null)
      resolve()
    }, 500)
  })
}

// Get current auth state
export function getAuthState(): AuthState {
  return authState
}
