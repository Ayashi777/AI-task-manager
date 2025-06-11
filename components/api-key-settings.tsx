"use client"

import { useState } from "react"
import { useApiKey } from "@/contexts/api-key-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Settings } from "lucide-react"

export function ApiKeySettings() {
  const { googleApiKey, setGoogleApiKey, clearGoogleApiKey, isKeyValid, validateKey, isValidating } = useApiKey()
  const [inputKey, setInputKey] = useState(googleApiKey || "")
  const [isOpen, setIsOpen] = useState(false)
  const [validationMessage, setValidationMessage] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  )

  const handleSave = async () => {
    if (!inputKey.trim()) {
      setValidationMessage({ type: "error", message: "API ключ не может быть пустым" })
      return
    }

    setGoogleApiKey(inputKey.trim())
    const isValid = await validateKey()

    if (isValid) {
      setValidationMessage({ type: "success", message: "API ключ успешно проверен и сохранен" })
      setTimeout(() => setIsOpen(false), 1500)
    } else {
      setValidationMessage({ type: "error", message: "Неверный API ключ. Пожалуйста, проверьте и попробуйте снова" })
    }
  }

  const handleClear = () => {
    clearGoogleApiKey()
    setInputKey("")
    setValidationMessage({ type: "success", message: "API ключ удален" })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          API Ключ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Настройка Google AI API</DialogTitle>
          <DialogDescription>
            Добавьте свой API ключ Google AI для использования функций искусственного интеллекта.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Google AI API Ключ</label>
            <Input
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              Получите ключ на{" "}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          {validationMessage && (
            <Alert variant={validationMessage.type === "error" ? "destructive" : "default"}>
              {validationMessage.type === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertTitle>{validationMessage.type === "error" ? "Ошибка" : "Успешно"}</AlertTitle>
              <AlertDescription>{validationMessage.message}</AlertDescription>
            </Alert>
          )}

          {googleApiKey && (
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isKeyValid ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className="text-sm">{isKeyValid ? "API ключ активен" : "API ключ недействителен"}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex space-x-2 sm:justify-between">
          {googleApiKey && (
            <Button variant="outline" onClick={handleClear} type="button">
              Удалить ключ
            </Button>
          )}
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={isValidating}>
              {isValidating ? "Проверка..." : "Сохранить"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
