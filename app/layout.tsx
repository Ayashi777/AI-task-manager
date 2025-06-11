import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { ApiKeyProvider } from "@/contexts/api-key-context"

const inter = Inter({ subsets: ["latin", "cyrillic"] })

export const metadata: Metadata = {
  title: "Трекер Задач с ИИ",
  description:
    "Комплексный инструмент для отслеживания задач, планирования целей и личной рефлексии с возможностями ИИ",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <ApiKeyProvider>{children}</ApiKeyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
