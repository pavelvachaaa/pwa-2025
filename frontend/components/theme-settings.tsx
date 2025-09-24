"use client"

import { useState } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function ThemeSettings() {
  const { toast } = useToast()
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark")
  const [accentColor, setAccentColor] = useState("blue")

  const themeOptions = [
    {
      value: "light" as const,
      label: "Light",
      description: "Light theme with bright colors",
      icon: Sun,
    },
    {
      value: "dark" as const,
      label: "Dark",
      description: "Dark theme with muted colors",
      icon: Moon,
    },
    {
      value: "system" as const,
      label: "System",
      description: "Follow your system preference",
      icon: Monitor,
    },
  ]

  const accentColors = [
    { value: "blue", label: "Blue", color: "bg-blue-500" },
    { value: "green", label: "Green", color: "bg-green-500" },
    { value: "purple", label: "Purple", color: "bg-purple-500" },
    { value: "pink", label: "Pink", color: "bg-pink-500" },
    { value: "orange", label: "Orange", color: "bg-orange-500" },
    { value: "red", label: "Red", color: "bg-red-500" },
  ]

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme)
    // In a real app, you would apply the theme here
    document.documentElement.className = newTheme === "system" ? "" : newTheme
    toast({
      title: "Theme updated",
      description: `Switched to ${newTheme} theme.`,
    })
  }

  const handleAccentColorChange = (color: string) => {
    setAccentColor(color)
    toast({
      title: "Accent color updated",
      description: `Changed accent color to ${color}.`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how the app looks and feels.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-medium">Theme</Label>
            <p className="text-sm text-muted-foreground mb-4">Select your preferred theme</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => handleThemeChange(option.value)}
                    className={`p-4 rounded-lg border-2 transition-colors text-left ${
                      theme === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle>Accent Color</CardTitle>
          <CardDescription>Choose your preferred accent color for highlights and buttons.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {accentColors.map((color) => (
              <button
                key={color.value}
                onClick={() => handleAccentColorChange(color.value)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-colors ${
                  accentColor === color.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent/50"
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${color.color}`} />
                <span className="font-medium">{color.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Customization */}
      <Card>
        <CardHeader>
          <CardTitle>Chat Customization</CardTitle>
          <CardDescription>Customize your chat experience.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Compact Mode</Label>
              <p className="text-sm text-muted-foreground">Reduce spacing in chat messages</p>
            </div>
            <Button variant="outline" size="sm">
              Enable
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Message Animations</Label>
              <p className="text-sm text-muted-foreground">Enable smooth animations for new messages</p>
            </div>
            <Button variant="outline" size="sm">
              Enabled
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Font Size</Label>
              <p className="text-sm text-muted-foreground">Adjust the size of chat text</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Small
              </Button>
              <Button variant="default" size="sm">
                Medium
              </Button>
              <Button variant="outline" size="sm">
                Large
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
