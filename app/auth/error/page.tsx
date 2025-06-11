"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function AuthErrorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "Ошибка конфигурации сервера"
      case "AccessDenied":
        return "Доступ запрещен"
      case "Verification":
        return "Ошибка верификации"
      default:
        return "Произошла ошибка при входе в систему"
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Ошибка входа</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">{getErrorMessage(error)}</p>
          <Button onClick={() => router.push("/auth/sign-in")} className="w-full">
            Попробовать снова
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
