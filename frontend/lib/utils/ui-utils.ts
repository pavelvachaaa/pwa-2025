import type { RefObject } from "react"

/**
 * Smoothly scroll an element into view
 */
export function scrollToElement(element: HTMLElement | null, behavior: ScrollBehavior = "smooth"): void {
  element?.scrollIntoView({ behavior })
}

/**
 * Scroll to bottom using a ref
 */
export function scrollToBottom(ref: RefObject<HTMLElement>, behavior: ScrollBehavior = "smooth"): void {
  scrollToElement(ref.current, behavior)
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * Determine user presence status from presence data
 */
export function getUserPresenceStatus(
  userStatus?: string,
  presenceStatus?: string
): "online" | "away" | "offline" {
  return (presenceStatus ?? userStatus ?? "offline") as "online" | "away" | "offline"
}

/**
 * Check if user is online
 */
export function isUserOnline(status: string): boolean {
  return status === "online"
}