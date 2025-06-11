"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface ApiKeyContextType {
  googleApiKey: string | null
  setGoogleApiKey: (key: string) => void
  clearGoogleApiKey: () => void
  isKeyValid: boolean
  validateKey: () => Promise<boolean>
  isValidating: boolean
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined)

const API_KEY_STORAGE_KEY = "taskTracker_googleApiKey"

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [googleApiKey, setGoogleApiKeyState] = useState<string | null>(null)
  const [isKeyValid, setIsKeyValid] = useState<boolean>(false)
  const [isValidating, setIsValidating] = useState<boolean>(false)

  useEffect(() => {
    // Load API key from localStorage on mount
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY)
      if (savedKey) {
        setGoogleApiKeyState(savedKey)
        // Validate the key when loaded
        validateApiKey(savedKey).then(setIsKeyValid)
      }
    }
  }, [])

  const setGoogleApiKey = (key: string) => {
    setGoogleApiKeyState(key)
    if (typeof window !== "undefined") {
      localStorage.setItem(API_KEY_STORAGE_KEY, key)
    }
  }

  const clearGoogleApiKey = () => {
    setGoogleApiKeyState(null)
    setIsKeyValid(false)
    if (typeof window !== "undefined") {
      localStorage.removeItem(API_KEY_STORAGE_KEY)
    }
  }

  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      // Simple validation request to Google AI API
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + key)
      const data = await response.json()

      // If we get models list back, the key is valid
      return Array.isArray(data.models)
    } catch (error) {
      console.error("Error validating API key:", error)
      return false
    }
  }

  const validateKey = async (): Promise<boolean> => {
    if (!googleApiKey) return false

    setIsValidating(true)
    try {
      const isValid = await validateApiKey(googleApiKey)
      setIsKeyValid(isValid)
      return isValid
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <ApiKeyContext.Provider
      value={{
        googleApiKey,
        setGoogleApiKey,
        clearGoogleApiKey,
        isKeyValid,
        validateKey,
        isValidating,
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  )
}

export function useApiKey() {
  const context = useContext(ApiKeyContext)
  if (context === undefined) {
    throw new Error("useApiKey must be used within an ApiKeyProvider")
  }
  return context
}
