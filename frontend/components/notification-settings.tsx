"use client"

import { useState } from "react"
import { Bell, Mail, MessageSquare, Users, Volume2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

export function NotificationSettings() {
  const { toast } = useToast()
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: false,
    messageNotifications: true,
    groupNotifications: true,
    soundNotifications: true,
    desktopNotifications: true,
    messagePreview: true,
    typingIndicators: true,
    readReceipts: true,
  })

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    toast({
      title: "Setting updated",
      description: "Your notification preferences have been saved.",
    })
  }

  const notificationSections = [
    {
      title: "General Notifications",
      description: "Control how you receive notifications",
      settings: [
        {
          key: "pushNotifications" as const,
          label: "Push Notifications",
          description: "Receive push notifications on your device",
          icon: Bell,
        },
        {
          key: "emailNotifications" as const,
          label: "Email Notifications",
          description: "Receive notifications via email",
          icon: Mail,
        },
        {
          key: "desktopNotifications" as const,
          label: "Desktop Notifications",
          description: "Show notifications on your desktop",
          icon: Bell,
        },
      ],
    },
    {
      title: "Message Notifications",
      description: "Customize message-related notifications",
      settings: [
        {
          key: "messageNotifications" as const,
          label: "Direct Messages",
          description: "Get notified for new direct messages",
          icon: MessageSquare,
        },
        {
          key: "groupNotifications" as const,
          label: "Group Messages",
          description: "Get notified for new group messages",
          icon: Users,
        },
        {
          key: "soundNotifications" as const,
          label: "Sound Notifications",
          description: "Play sound for new messages",
          icon: Volume2,
        },
      ],
    },
    {
      title: "Privacy & Activity",
      description: "Control what others can see about your activity",
      settings: [
        {
          key: "messagePreview" as const,
          label: "Message Preview",
          description: "Show message content in notifications",
          icon: MessageSquare,
        },
        {
          key: "typingIndicators" as const,
          label: "Typing Indicators",
          description: "Show when you're typing to others",
          icon: MessageSquare,
        },
        {
          key: "readReceipts" as const,
          label: "Read Receipts",
          description: "Let others know when you've read their messages",
          icon: MessageSquare,
        },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {notificationSections.map((section, sectionIndex) => (
        <Card key={sectionIndex}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.settings.map((setting, settingIndex) => {
              const Icon = setting.icon
              return (
                <div key={setting.key}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label htmlFor={setting.key} className="font-medium">
                          {setting.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={setting.key}
                      checked={settings[setting.key]}
                      onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
                    />
                  </div>
                  {settingIndex < section.settings.length - 1 && <Separator className="mt-4" />}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
