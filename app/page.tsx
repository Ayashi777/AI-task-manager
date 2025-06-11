"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, Edit, Trash2, Send, Download, Upload, Moon, Sun, AlertCircle } from "lucide-react"
import { useTheme } from "next-themes"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

import { AuthGuard } from "@/components/auth-guard"
import { UserProfile } from "@/components/user-profile"
import { useAuth } from "@/contexts/auth-context"
import { useApiKey } from "@/contexts/api-key-context"
import { ApiKeySettings } from "@/components/api-key-settings"

// Types
interface Task {
  id: string
  title: string
  description: string
  isDone: boolean
  createdAt: number
  plannedStartTime?: number
  plannedEndTime?: number
  actualEndTime?: number
}

interface DailyLog {
  date: string
  tasksToday: Task[]
  tasksForTomorrow: Task[]
  insight: string
  challenge: string
  rating: number | null
  daySummary?: string
}

interface WeeklyGoal {
  text: string
}

interface MonthlyGoal {
  text: string
  weeks: [WeeklyGoal, WeeklyGoal, WeeklyGoal, WeeklyGoal]
}

interface FixedGoals {
  threeMonth: {
    text: string
    startDate?: number
    endDate?: number
  }
  month1: MonthlyGoal
  month2: MonthlyGoal
  month3: MonthlyGoal
}

interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
}

export default function TaskTracker() {
  const { theme, setTheme } = useTheme()
  const [currentDate, setCurrentDate] = useState<string>("")
  const [viewingDate, setViewingDate] = useState<string>("")
  const [dailyLogs, setDailyLogs] = useState<{ [date: string]: DailyLog }>({})
  const [fixedGoals, setFixedGoals] = useState<FixedGoals>({
    threeMonth: { text: "" },
    month1: { text: "", weeks: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }] },
    month2: { text: "", weeks: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }] },
    month3: { text: "", weeks: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }] },
  })
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [editingTask, setEditingTask] = useState<{ id: string; type: "today" | "tomorrow" } | null>(null)

  // New task inputs
  const [newTaskToday, setNewTaskToday] = useState({ title: "", description: "", plannedStart: "", plannedEnd: "" })
  const [newTaskTomorrow, setNewTaskTomorrow] = useState({
    title: "",
    description: "",
    plannedStart: "",
    plannedEnd: "",
  })

  const { user } = useAuth()
  const { googleApiKey, isKeyValid } = useApiKey()
  const LOCAL_STORAGE_KEY = user?.id ? `taskAppAI_v1_${user.id}` : "taskAppAI_v1_guest"

  useEffect(() => {
    const today = formatDate(new Date())
    setCurrentDate(today)
    setViewingDate(today)
    loadState()
  }, [])

  useEffect(() => {
    saveState()
  }, [dailyLogs, fixedGoals, chatMessages, viewingDate])

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0]
  }

  const formatDateTime = (timestamp?: number): string => {
    if (!timestamp) return "N/A"
    return new Date(timestamp).toLocaleString("ru-RU")
  }

  const formatDateTimeLocal = (timestamp?: number): string => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    const offset = date.getTimezoneOffset() * 60000
    const localDate = new Date(date.getTime() - offset)
    return localDate.toISOString().slice(0, 16)
  }

  const loadState = () => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      const state = JSON.parse(saved)
      setDailyLogs(state.dailyLogs || {})
      setFixedGoals(state.fixedGoals || fixedGoals)
      setChatMessages(state.chatMessages || [])
    }
  }

  const saveState = () => {
    const state = {
      dailyLogs,
      fixedGoals,
      chatMessages,
      viewingDate,
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
  }

  const getViewingLog = (): DailyLog => {
    if (!dailyLogs[viewingDate]) {
      const newLog: DailyLog = {
        date: viewingDate,
        tasksToday: [],
        tasksForTomorrow: [],
        insight: "",
        challenge: "",
        rating: null,
        daySummary: "",
      }
      setDailyLogs((prev) => ({ ...prev, [viewingDate]: newLog }))
      return newLog
    }
    return dailyLogs[viewingDate]
  }

  const navigateDate = (direction: "prev" | "next" | "today") => {
    const current = new Date(viewingDate)
    if (direction === "prev") {
      current.setDate(current.getDate() - 1)
      setViewingDate(formatDate(current))
    } else if (direction === "next" && viewingDate < currentDate) {
      current.setDate(current.getDate() + 1)
      setViewingDate(formatDate(current))
    } else if (direction === "today") {
      setViewingDate(currentDate)
    }
  }

  const addTask = (type: "today" | "tomorrow") => {
    const taskData = type === "today" ? newTaskToday : newTaskTomorrow
    if (!taskData.title.trim()) return

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: taskData.title.trim(),
      description: taskData.description.trim(),
      isDone: false,
      createdAt: Date.now(),
      plannedStartTime: taskData.plannedStart ? new Date(taskData.plannedStart).getTime() : undefined,
      plannedEndTime: taskData.plannedEnd ? new Date(taskData.plannedEnd).getTime() : undefined,
    }

    const log = getViewingLog()
    const updatedLog = {
      ...log,
      [type === "today" ? "tasksToday" : "tasksForTomorrow"]: [
        ...log[type === "today" ? "tasksToday" : "tasksForTomorrow"],
        newTask,
      ],
    }

    setDailyLogs((prev) => ({ ...prev, [viewingDate]: updatedLog }))

    if (type === "today") {
      setNewTaskToday({ title: "", description: "", plannedStart: "", plannedEnd: "" })
    } else {
      setNewTaskTomorrow({ title: "", description: "", plannedStart: "", plannedEnd: "" })
    }
  }

  const toggleTask = (taskId: string, type: "today" | "tomorrow") => {
    const log = getViewingLog()
    const tasks = type === "today" ? log.tasksToday : log.tasksForTomorrow
    const updatedTasks = tasks.map((task) => {
      if (task.id === taskId) {
        const updatedTask = { ...task, isDone: !task.isDone }
        if (updatedTask.isDone) {
          updatedTask.actualEndTime = Date.now()
        } else {
          updatedTask.actualEndTime = undefined
        }
        return updatedTask
      }
      return task
    })

    const updatedLog = {
      ...log,
      [type === "today" ? "tasksToday" : "tasksForTomorrow"]: updatedTasks,
    }

    setDailyLogs((prev) => ({ ...prev, [viewingDate]: updatedLog }))
  }

  const deleteTask = (taskId: string, type: "today" | "tomorrow") => {
    if (!confirm("Вы уверены, что хотите удалить эту задачу?")) return

    const log = getViewingLog()
    const tasks = type === "today" ? log.tasksToday : log.tasksForTomorrow
    const updatedTasks = tasks.filter((task) => task.id !== taskId)

    const updatedLog = {
      ...log,
      [type === "today" ? "tasksToday" : "tasksForTomorrow"]: updatedTasks,
    }

    setDailyLogs((prev) => ({ ...prev, [viewingDate]: updatedLog }))
  }

  const updateReflection = (field: "insight" | "challenge" | "rating", value: string) => {
    const log = getViewingLog()
    const updatedLog = {
      ...log,
      [field]: field === "rating" ? (value ? Number.parseInt(value) : null) : value,
    }
    setDailyLogs((prev) => ({ ...prev, [viewingDate]: updatedLog }))
  }

  const generateDaySummary = async () => {
    const log = getViewingLog()
    setIsLoading(true)

    try {
      const completedTasks = log.tasksToday.filter((t) => t.isDone)
      const incompleteTasks = log.tasksToday.filter((t) => !t.isDone)

      // Check if we have a valid API key
      if (googleApiKey && isKeyValid) {
        try {
          const { text } = await generateText({
            model: google("gemini-1.5-flash", { apiKey: googleApiKey }),
            prompt: `Создай краткое саммари дня на основе следующих данных:

Дата: ${log.date}
Выполненные задачи: ${completedTasks.map((t) => `${t.title}: ${t.description}`).join(", ") || "Нет"}
Невыполненные задачи: ${incompleteTasks.map((t) => `${t.title}: ${t.description}`).join(", ") || "Нет"}
Планы на будущее: ${log.tasksForTomorrow.map((t) => `${t.title}: ${t.description}`).join(", ") || "Нет"}
Инсайт дня: ${log.insight || "Нет"}
Трудности дня: ${log.challenge || "Нет"}
Оценка дня: ${log.rating || "Нет"}

Создай краткое саммари (2-3 абзаца) на русском языке, выделяя ключевые достижения, проблемы и инсайты.`,
          })

          const updatedLog = { ...log, daySummary: text }
          setDailyLogs((prev) => ({ ...prev, [viewingDate]: updatedLog }))
        } catch (apiError) {
          console.error("API error:", apiError)
          // Fallback to simple summary
          const summary = generateFallbackSummary(log, completedTasks, incompleteTasks)
          const updatedLog = { ...log, daySummary: summary }
          setDailyLogs((prev) => ({ ...prev, [viewingDate]: updatedLog }))
        }
      } else {
        // No valid API key, use fallback
        const summary = generateFallbackSummary(log, completedTasks, incompleteTasks)
        const updatedLog = { ...log, daySummary: summary }
        setDailyLogs((prev) => ({ ...prev, [viewingDate]: updatedLog }))
      }
    } catch (error) {
      console.error("Error generating summary:", error)
      alert("Ошибка при генерации саммари")
    } finally {
      setIsLoading(false)
    }
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: chatInput,
      timestamp: Date.now(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setIsLoading(true)

    try {
      let prompt = chatInput

      // Check if it's an analysis request
      if (chatInput.toLowerCase().includes("анализ") || chatInput.toLowerCase().includes("прогресс")) {
        const recentLogs = Object.values(dailyLogs)
          .filter((log) => new Date(log.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        const analysisData = recentLogs
          .map((log) => {
            const completed = log.tasksToday.filter((t) => t.isDone)
            const incomplete = log.tasksToday.filter((t) => !t.isDone)
            return `
Дата: ${log.date}
Выполнено: ${completed.length} задач
Не выполнено: ${incomplete.length} задач
Оценка дня: ${log.rating || "Нет"}
Инсайт: ${log.insight || "Нет"}
Трудности: ${log.challenge || "Нет"}
`
          })
          .join("\n")

        prompt = `${chatInput}

Данные за последние 30 дней:
${analysisData}

Стратегический план:
3-месячная цель: ${fixedGoals.threeMonth.text || "Не указана"}
Месяц 1: ${fixedGoals.month1.text || "Не указан"}
Месяц 2: ${fixedGoals.month2.text || "Не указан"}
Месяц 3: ${fixedGoals.month3.text || "Не указан"}

Проанализируй прогресс и дай рекомендации.`
      }

      if (googleApiKey && isKeyValid) {
        try {
          const { text } = await generateText({
            model: google("gemini-1.5-flash", { apiKey: googleApiKey }),
            prompt: `Ты - ИИ-коуч по продуктивности. Помогай анализировать задачи и достигать целей. ${prompt}`,
          })

          const assistantMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: text,
            timestamp: Date.now(),
          }

          setChatMessages((prev) => [...prev, assistantMessage])
        } catch (apiError) {
          console.error("API error:", apiError)
          // Fallback response when API fails
          const fallbackResponse = generateFallbackChatResponse(chatInput)
          const assistantMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: fallbackResponse,
            timestamp: Date.now(),
          }

          setChatMessages((prev) => [...prev, assistantMessage])
        }
      } else {
        // No valid API key, use fallback
        const fallbackResponse = generateFallbackChatResponse(chatInput)
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: fallbackResponse,
          timestamp: Date.now(),
        }

        setChatMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "system",
        content: "Ошибка при отправке сообщения",
        timestamp: Date.now(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    const data = {
      dailyLogs,
      fixedGoals,
      chatMessages,
      exportDate: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `task-tracker-${formatDate(new Date())}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (confirm("Импорт перезапишет все текущие данные. Продолжить?")) {
          setDailyLogs(data.dailyLogs || {})
          setFixedGoals(data.fixedGoals || fixedGoals)
          setChatMessages(data.chatMessages || [])
          alert("Данные успешно импортированы!")
        }
      } catch (error) {
        alert("Ошибка при импорте данных")
      }
    }
    reader.readAsText(file)
  }

  // Helper function to generate fallback summary
  const generateFallbackSummary = (log: DailyLog, completedTasks: Task[], incompleteTasks: Task[]) => {
    const completionRate =
      log.tasksToday.length > 0 ? Math.round((completedTasks.length / log.tasksToday.length) * 100) : 0

    let summary = `📊 Саммари дня ${log.date}\n\n`

    summary += `Продуктивность: ${completionRate}% (${completedTasks.length} из ${log.tasksToday.length} задач выполнено)\n\n`

    if (completedTasks.length > 0) {
      summary += `✅ Выполненные задачи:\n${completedTasks.map((t) => `• ${t.title}`).join("\n")}\n\n`
    }

    if (incompleteTasks.length > 0) {
      summary += `⏳ Невыполненные задачи:\n${incompleteTasks.map((t) => `• ${t.title}`).join("\n")}\n\n`
    }

    if (log.insight) {
      summary += `💡 Инсайт дня: ${log.insight}\n\n`
    }

    if (log.challenge) {
      summary += `⚠️ Трудности: ${log.challenge}\n\n`
    }

    if (log.rating) {
      summary += `⭐ Оценка дня: ${log.rating}/10\n\n`
    }

    if (log.tasksForTomorrow.length > 0) {
      summary += `🎯 Планы на будущее:\n${log.tasksForTomorrow.map((t) => `• ${t.title}`).join("\n")}`
    }

    if (!googleApiKey || !isKeyValid) {
      summary += `\n\n📝 Примечание: Для использования ИИ-анализа добавьте свой Google AI API ключ в настройках.`
    }

    return summary
  }

  // Helper function to generate fallback chat responses
  const generateFallbackChatResponse = (input: string) => {
    const lowerInput = input.toLowerCase()

    if (!googleApiKey || !isKeyValid) {
      if (lowerInput.includes("ключ") || lowerInput.includes("api") || lowerInput.includes("настрой")) {
        return `🔑 Для использования ИИ-функций необходимо добавить Google AI API ключ.

Как получить ключ:
1. Перейдите на сайт Google AI Studio: https://makersuite.google.com/app/apikey
2. Создайте новый API ключ
3. Добавьте его в настройках приложения (кнопка "API Ключ" в верхнем меню)

После добавления ключа вы получите доступ к:
• Персонализированным саммари дня
• Умному анализу ваших задач и целей
• Рекомендациям по повышению продуктивности`
      }
    }

    if (lowerInput.includes("анализ") || lowerInput.includes("прогресс")) {
      return `📊 ${!googleApiKey || !isKeyValid ? "Для полного анализа прогресса необходимо добавить Google AI API ключ. " : ""}

Однако я могу предложить несколько общих рекомендаций:

🎯 Советы по продуктивности:
• Разбивайте большие задачи на маленькие
• Устанавливайте конкретные временные рамки
• Регулярно делайте перерывы
• Анализируйте свои успехи и неудачи

📈 Для отслеживания прогресса:
• Ведите ежедневную рефлексию
• Отмечайте выполненные задачи
• Ставьте реалистичные цели
• Празднуйте маленькие победы

${!googleApiKey || !isKeyValid ? "💡 Добавьте Google AI API ключ в настройках для получения персонализированных советов и детального анализа ваших данных." : ""}`
    }

    if (lowerInput.includes("задач") || lowerInput.includes("планирование")) {
      return `📋 Советы по управлению задачами:

✅ Эффективное планирование:
• Используйте метод SMART для постановки целей
• Приоритизируйте задачи по важности и срочности
• Планируйте время с запасом на непредвиденные обстоятельства

⏰ Управление временем:
• Используйте технику Pomodoro (25 минут работы + 5 минут отдыха)
• Группируйте похожие задачи
• Избегайте многозадачности

${!googleApiKey || !isKeyValid ? "🎯 Для получения персонализированных советов на основе ваших данных, добавьте Google AI API ключ в настройках." : ""}`
    }

    if (lowerInput.includes("мотивация") || lowerInput.includes("цел")) {
      return `🎯 Советы по достижению целей:

💪 Поддержание мотивации:
• Визуализируйте результат
• Разбивайте большие цели на этапы
• Отмечайте промежуточные достижения
• Найдите партнера по подотчетности

📈 Отслеживание прогресса:
• Ведите ежедневные записи
• Анализируйте что работает, а что нет
• Корректируйте планы при необходимости

${!googleApiKey || !isKeyValid ? "🔧 Для детального анализа ваших целей и персональных рекомендаций, добавьте Google AI API ключ в настройках." : ""}`
    }

    return `🤖 Привет! Я ваш ассистент по продуктивности.

${!googleApiKey || !isKeyValid ? "К сожалению, для полноценной работы мне нужен доступ к Google AI API. Сейчас я работаю в ограниченном режиме." : ""}

💡 Что я могу предложить:
• Общие советы по продуктивности
• Рекомендации по планированию
• Базовые техники управления временем

${!googleApiKey || !isKeyValid ? "🔧 Для получения персонализированных советов на основе ваших данных, добавьте Google AI API ключ в настройках." : ""}

Чем могу помочь${!googleApiKey || !isKeyValid ? " в рамках базового функционала" : ""}?`
  }

  const log = getViewingLog()
  const isToday = viewingDate === currentDate

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-7xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Трекер Задач и Целей</h1>
            <div className="flex items-center gap-2">
              <ApiKeySettings />
              <UserProfile />
              <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Date Navigation */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => navigateDate("prev")}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Пред. день
                </Button>
                <div className="text-lg font-semibold">{isToday ? `Сегодня (${viewingDate})` : viewingDate}</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigateDate("next")} disabled={viewingDate >= currentDate}>
                    След. день
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button onClick={() => navigateDate("today")}>Сегодня</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Today's Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle>{isToday ? "Задачи на сегодня" : `Что было сделано ${viewingDate}`}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Новая задача"
                      value={newTaskToday.title}
                      onChange={(e) => setNewTaskToday((prev) => ({ ...prev, title: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Описание (опционально)"
                      value={newTaskToday.description}
                      onChange={(e) => setNewTaskToday((prev) => ({ ...prev, description: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm text-muted-foreground">Плановое начало:</label>
                        <Input
                          type="datetime-local"
                          value={newTaskToday.plannedStart}
                          onChange={(e) => setNewTaskToday((prev) => ({ ...prev, plannedStart: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Плановый конец:</label>
                        <Input
                          type="datetime-local"
                          value={newTaskToday.plannedEnd}
                          onChange={(e) => setNewTaskToday((prev) => ({ ...prev, plannedEnd: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button onClick={() => addTask("today")} className="w-full">
                      Добавить задачу
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {log.tasksToday.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Пока нет задач</p>
                    ) : (
                      log.tasksToday.map((task) => (
                        <div key={task.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Checkbox checked={task.isDone} onCheckedChange={() => toggleTask(task.id, "today")} />
                              <span className={task.isDone ? "line-through text-muted-foreground" : ""}>
                                {task.title}
                              </span>
                            </div>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id, "today")}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {task.description && <p className="text-sm text-muted-foreground ml-6">{task.description}</p>}
                          <div className="text-xs text-muted-foreground ml-6 space-y-1">
                            <p>
                              <strong>Создана:</strong> {formatDateTime(task.createdAt)}
                            </p>
                            <p>
                              <strong>План. начало:</strong> {formatDateTime(task.plannedStartTime)}
                            </p>
                            <p>
                              <strong>План. конец:</strong> {formatDateTime(task.plannedEndTime)}
                            </p>
                            <p>
                              <strong>Факт. конец:</strong> {formatDateTime(task.actualEndTime)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tomorrow's Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {isToday ? "Планы на будущее" : `Что было запланировано ${viewingDate} на будущее`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Новая задача на будущее"
                      value={newTaskTomorrow.title}
                      onChange={(e) => setNewTaskTomorrow((prev) => ({ ...prev, title: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Описание (опционально)"
                      value={newTaskTomorrow.description}
                      onChange={(e) => setNewTaskTomorrow((prev) => ({ ...prev, description: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm text-muted-foreground">Плановое начало:</label>
                        <Input
                          type="datetime-local"
                          value={newTaskTomorrow.plannedStart}
                          onChange={(e) => setNewTaskTomorrow((prev) => ({ ...prev, plannedStart: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Плановый конец:</label>
                        <Input
                          type="datetime-local"
                          value={newTaskTomorrow.plannedEnd}
                          onChange={(e) => setNewTaskTomorrow((prev) => ({ ...prev, plannedEnd: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button onClick={() => addTask("tomorrow")} className="w-full">
                      Добавить задачу
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {log.tasksForTomorrow.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Пока нет планов</p>
                    ) : (
                      log.tasksForTomorrow.map((task) => (
                        <div key={task.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Checkbox checked={task.isDone} onCheckedChange={() => toggleTask(task.id, "tomorrow")} />
                              <span className={task.isDone ? "line-through text-muted-foreground" : ""}>
                                {task.title}
                              </span>
                            </div>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id, "tomorrow")}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {task.description && <p className="text-sm text-muted-foreground ml-6">{task.description}</p>}
                          <div className="text-xs text-muted-foreground ml-6 space-y-1">
                            <p>
                              <strong>Создана:</strong> {formatDateTime(task.createdAt)}
                            </p>
                            <p>
                              <strong>План. начало:</strong> {formatDateTime(task.plannedStartTime)}
                            </p>
                            <p>
                              <strong>План. конец:</strong> {formatDateTime(task.plannedEndTime)}
                            </p>
                            <p>
                              <strong>Факт. конец:</strong> {formatDateTime(task.actualEndTime)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Reflection */}
              <Card>
                <CardHeader>
                  <CardTitle>Рефлексия и саммари дня ({viewingDate})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Инсайт дня:</label>
                    <Textarea
                      value={log.insight}
                      onChange={(e) => updateReflection("insight", e.target.value)}
                      placeholder="Что нового я узнал сегодня?"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Трудности дня:</label>
                    <Textarea
                      value={log.challenge}
                      onChange={(e) => updateReflection("challenge", e.target.value)}
                      placeholder="С какими трудностями я столкнулся?"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Оценка дня (1-10):</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={log.rating || ""}
                      onChange={(e) => updateReflection("rating", e.target.value)}
                    />
                  </div>

                  {log.daySummary ? (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Саммари дня:</h4>
                      <p className="text-sm whitespace-pre-wrap">{log.daySummary}</p>
                    </div>
                  ) : (
                    <Button onClick={generateDaySummary} disabled={isLoading} className="w-full">
                      {isLoading ? "Генерация..." : `Сгенерировать саммари дня ${viewingDate}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* AI Chat */}
              <Card>
                <CardHeader>
                  <CardTitle>Чат с ИИ-ассистентом</CardTitle>
                  {!googleApiKey || !isKeyValid ? (
                    <div className="text-sm text-amber-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>Для полного функционала добавьте Google AI API ключ</span>
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <div className="h-96 border rounded-lg flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.length === 0 ? (
                        <p className="text-muted-foreground text-center">Начните диалог с ИИ-ассистентом</p>
                      ) : (
                        chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`p-3 rounded-lg max-w-[80%] ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground ml-auto"
                                : message.role === "assistant"
                                  ? "bg-muted"
                                  : "bg-destructive text-destructive-foreground"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        ))
                      )}
                      {isLoading && (
                        <div className="bg-muted p-3 rounded-lg max-w-[80%]">
                          <p className="text-sm">ИИ печатает...</p>
                        </div>
                      )}
                    </div>
                    <div className="border-t p-4 flex gap-2">
                      <Textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Спросите ИИ..."
                        className="flex-1"
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            sendChatMessage()
                          }
                        }}
                      />
                      <Button onClick={sendChatMessage} disabled={isLoading}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Strategic Plan */}
              <Card>
                <CardHeader>
                  <CardTitle>Стратегический План</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Цель на 3 месяца:</label>
                    <Textarea
                      value={fixedGoals.threeMonth.text}
                      onChange={(e) =>
                        setFixedGoals((prev) => ({
                          ...prev,
                          threeMonth: { ...prev.threeMonth, text: e.target.value },
                        }))
                      }
                      placeholder="Опишите вашу главную цель на 3 месяца"
                    />
                  </div>

                  <Tabs defaultValue="month1" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="month1">Месяц 1</TabsTrigger>
                      <TabsTrigger value="month2">Месяц 2</TabsTrigger>
                      <TabsTrigger value="month3">Месяц 3</TabsTrigger>
                    </TabsList>

                    {(["month1", "month2", "month3"] as const).map((month, index) => (
                      <TabsContent key={month} value={month} className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Цель на {index + 1}-й месяц:</label>
                          <Textarea
                            value={fixedGoals[month].text}
                            onChange={(e) =>
                              setFixedGoals((prev) => ({
                                ...prev,
                                [month]: { ...prev[month], text: e.target.value },
                              }))
                            }
                            placeholder={`Цель на ${index + 1}-й месяц`}
                          />
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Недельные фокусы:</h4>
                          {fixedGoals[month].weeks.map((week, weekIndex) => (
                            <div key={weekIndex}>
                              <label className="text-xs text-muted-foreground">Неделя {weekIndex + 1}:</label>
                              <Input
                                value={week.text}
                                onChange={(e) => {
                                  const newWeeks = [...fixedGoals[month].weeks]
                                  newWeeks[weekIndex] = { text: e.target.value }
                                  setFixedGoals((prev) => ({
                                    ...prev,
                                    [month]: {
                                      ...prev[month],
                                      weeks: newWeeks as [WeeklyGoal, WeeklyGoal, WeeklyGoal, WeeklyGoal],
                                    },
                                  }))
                                }}
                                placeholder={`Фокус на неделю ${weekIndex + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>

                  <Button className="w-full">Сохранить цели</Button>
                </CardContent>
              </Card>

              {/* Data Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Управление Данными</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={exportData} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Экспорт данных
                  </Button>
                  <div>
                    <input type="file" accept=".json" onChange={importData} className="hidden" id="import-file" />
                    <Button
                      onClick={() => document.getElementById("import-file")?.click()}
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Импорт данных
                    </Button>
                  </div>
                  <Button
                    onClick={() => {
                      if (confirm("Вы уверены, что хотите удалить все данные?")) {
                        localStorage.removeItem(LOCAL_STORAGE_KEY)
                        window.location.reload()
                      }
                    }}
                    variant="destructive"
                    className="w-full"
                  >
                    Удалить все данные
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
