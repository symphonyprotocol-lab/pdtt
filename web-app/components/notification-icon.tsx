"use client"

import { useEffect, useState, useMemo } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const API_BASE =
  (process.env.NEXT_PUBLIC_BACKEND_URL &&
    process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) ||
  ""
const buildApiUrl = (path: string) => {
  if (!API_BASE) return ""
  return `${API_BASE}/api${path}`
}

interface Notification {
  id: string
  campaign_id: string
  target_user_address: string
  title: string
  content: string
  voucher_detail: Record<string, any>
  delivered: boolean
  read: boolean
  user_accepted: boolean
  created_at: string
  delivered_at: string | null
  read_at: string | null
  accepted_at: string | null
}

interface NotificationsResponse {
  notifications: Notification[]
}

export function NotificationIcon() {
  const { account, connected } = useWallet()
  const [unreadCount, setUnreadCount] = useState(0)

  const walletAddress = useMemo(() => {
    const addr = account?.address as unknown
    if (!addr) return null
    if (typeof addr === "string") return addr
    if (typeof addr === "object" && "toString" in addr) {
      const value = (addr as { toString: () => string }).toString()
      return typeof value === "string" ? value : null
    }
    return null
  }, [account?.address])

  useEffect(() => {
    if (!connected || !walletAddress || !API_BASE) {
      setUnreadCount(0)
      return
    }

    const fetchNotifications = async () => {
      // Double check API_BASE and walletAddress before proceeding
      if (!API_BASE || !walletAddress) {
        return
      }

      try {
        const url = buildApiUrl(`/notifications/${walletAddress}`)
        
        // Validate URL before fetching - ensure it's a valid absolute URL
        if (!url || url === "/api/notifications/" || !url.startsWith("http")) {
          return
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          // Silently fail for non-200 responses
          return
        }

        const data: NotificationsResponse = await response.json()
        const undelivered = data.notifications?.filter((n) => !n.delivered_at).length || 0
        setUnreadCount(undelivered)
      } catch (error) {
        // Handle AbortError (timeout) and network errors silently
        if (error instanceof Error) {
          // Only log in development, and skip AbortError and network errors
          if (
            process.env.NODE_ENV === "development" &&
            error.name !== "AbortError" &&
            !error.message.includes("Failed to fetch")
          ) {
            console.error("Error fetching notifications:", error)
          }
        }
        // Don't update unreadCount on error to avoid flickering
      }
    }

    fetchNotifications()
    // Poll every 10 seconds for new notifications
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [connected, walletAddress])

  if (!connected) {
    return null
  }

  return (
    <Link href="/notifications">
      <Button
        variant="ghost"
        size="icon"
        className="relative text-slate-300 hover:text-slate-100 hover:bg-slate-800/50"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  )
}

