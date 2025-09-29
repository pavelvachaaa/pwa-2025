import { useState, useEffect, useCallback } from "react"
import { useChat } from "@/lib/chat/context"
import type { User } from "@/types"

interface PresenceState {
  status: string
  lastSeen?: Date
}

export function usePresence() {
  const { onUserPresenceUpdate } = useChat()
  const [presence, setPresence] = useState<Record<string, PresenceState>>({})

  const handlePresenceUpdate = useCallback((userId: string, status: string, lastSeen?: Date) => {
    setPresence(prev => ({
      ...prev,
      [userId]: { status, lastSeen }
    }))
  }, [])

  useEffect(() => {
    return onUserPresenceUpdate(handlePresenceUpdate)
  }, [onUserPresenceUpdate, handlePresenceUpdate])

  const getPresenceText = useCallback((user: User, userPresence?: PresenceState) => {
    const status = userPresence?.status ?? user?.status ?? "offline"
    const lastSeen = userPresence?.lastSeen ?? (user?.last_seen ? new Date(user.last_seen) : undefined)

    if (status === "online") return "Online"
    if (status === "away") return "Away"
    if (status === "offline" && lastSeen) {
      return `Last seen ${lastSeen.toLocaleDateString()} ${lastSeen.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    }
    return (status || "Offline").toString()
  }, [])

  return { presence, getPresenceText }
}