"use client"

import { useEffect, useState, useMemo } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Bell, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const API_BASE =
  (process.env.NEXT_PUBLIC_BACKEND_URL &&
    process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) ||
  ""
const buildApiUrl = (path: string) => `${API_BASE}/api${path}`

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

export default function NotificationsPage() {
  const { account, connected } = useWallet()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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
    if (!connected || !walletAddress) {
      setLoading(false)
      return
    }

    const fetchNotifications = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(buildApiUrl(`/notifications/${walletAddress}`))
        if (!response.ok) {
          throw new Error("Failed to fetch notifications")
        }

        const data: NotificationsResponse = await response.json()
        
        // Debug: log to check data structure
        if (data.notifications && data.notifications.length > 0) {
          console.log("Sample notification:", data.notifications[0])
          console.log("createdAt value:", data.notifications[0].createdAt)
          console.log("createdAt type:", typeof data.notifications[0].createdAt)
        }
        
        // Mark undelivered notifications (delivered=false and no delivered_at) as delivered when page loads
        const undeliveredNotifications = data.notifications.filter(
          n => !n.delivered && !n.delivered_at
        )
        
        // Mark all undelivered notifications as delivered (but not read)
        await Promise.all(
          undeliveredNotifications.map(notification =>
            fetch(buildApiUrl(`/notifications/${notification.id}/deliver`), {
              method: "PUT",
            }).catch(err => {
              console.error(`Error marking notification ${notification.id} as delivered:`, err)
            })
          )
        )
        
        // Fetch updated notifications
        const updatedResponse = await fetch(buildApiUrl(`/notifications/${walletAddress}`))
        if (updatedResponse.ok) {
          const updatedData: NotificationsResponse = await updatedResponse.json()
          setNotifications(updatedData.notifications)
        } else {
          // Fallback to original data if update fetch fails
          setNotifications(data.notifications)
        }
      } catch (err) {
        console.error("Error fetching notifications:", err)
        setError(err instanceof Error ? err.message : "Failed to load notifications")
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [connected, walletAddress])

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read (this happens when user clicks on notification)
    if (!notification.read) {
      try {
        await fetch(buildApiUrl(`/notifications/${notification.id}/read?read=true`), {
          method: "PUT",
        })
        // Update local state immediately for better UX
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? {
                  ...n,
                  read: true,
                  read_at: new Date().toISOString(),
                }
              : n
          )
        )
      } catch (err) {
        console.error("Error marking notification as read:", err)
      }
    }
    // Navigate to detail page
    router.push(`/notifications/${notification.id}`)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      console.warn("formatDate received null/undefined:", dateString)
      return ""
    }
    
    try {
      // Parse UTC date string and convert to local time
      const date = typeof dateString === "string" ? new Date(dateString) : dateString
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string:", dateString, "type:", typeof dateString)
        return ""
      }
      
      // Get current local time
      const now = new Date()
      // Calculate difference in milliseconds (both dates are already in local timezone)
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      // Use toLocaleDateString to show in local timezone
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch (err) {
      console.error("Error formatting date:", err, dateString, "type:", typeof dateString)
      return ""
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Connect Your Wallet</h2>
          <p className="text-slate-400 mb-4">Please connect your wallet to view notifications.</p>
          <Link href="/">
            <Button variant="web3">Go to Chat</Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <Link href="/">
            <Button variant="web3">Go Back</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-slate-100">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-cyan-400" />
              <h1 className="text-2xl font-bold text-cyan-400">Notifications</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {notifications.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-700/50 p-8">
            <div className="text-center py-8">
              <Bell className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-300 mb-2">No Notifications</h3>
              <p className="text-slate-400">You don't have any notifications yet.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`bg-slate-900/50 border-slate-700/50 hover:border-cyan-400/30 transition-colors cursor-pointer ${
                  !notification.read ? "border-cyan-400/50 bg-cyan-500/5" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-slate-100">{notification.title}</h3>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                        )}
                        {notification.user_accepted && (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        )}
                      </div>
                      <p className="text-slate-400 mb-3 line-clamp-2">{notification.content}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        {notification.created_at && formatDate(notification.created_at) ? (
                          <span>{formatDate(notification.created_at)}</span>
                        ) : null}
                        {notification.read ? (
                          <span className="text-slate-500">Read</span>
                        ) : (
                          <span className="text-cyan-400 font-medium">Unread</span>
                        )}
                        {notification.user_accepted && (
                          <span className="text-green-400">Accepted</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

