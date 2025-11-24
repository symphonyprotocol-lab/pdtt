"use client"

import { useEffect, useState, useMemo } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Check, X } from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { CouponVoucher } from "@/components/coupon-voucher"

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
  voucher_detail: Record<string, unknown>
  delivered: boolean
  read: boolean
  user_accepted: boolean
  created_at: string
  delivered_at: string | null
  read_at: string | null
  accepted_at: string | null
}

export default function NotificationDetailPage() {
  const { account, connected } = useWallet()
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [notification, setNotification] = useState<Notification | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const notificationId = params?.id as string

  useEffect(() => {
    if (!connected || !walletAddress || !notificationId) {
      setLoading(false)
      return
    }

    const fetchNotification = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(buildApiUrl(`/notifications/${walletAddress}`))
        if (!response.ok) {
          throw new Error("Failed to fetch notifications")
        }

        const data = await response.json()
        const found = data.notifications.find((n: Notification) => n.id === notificationId)

        if (!found) {
          throw new Error("Notification not found")
        }

        setNotification(found)

        // Mark as delivered first if not already delivered
        if (!found.delivered) {
          await fetch(buildApiUrl(`/notifications/${notificationId}/deliver`), {
            method: "PUT",
          })
        }

        // Mark as read if not already read (user clicked on notification)
        if (!found.read) {
          const readResponse = await fetch(buildApiUrl(`/notifications/${notificationId}/read?read=true`), {
            method: "PUT",
          })
          if (readResponse.ok) {
            const updated = await readResponse.json()
            setNotification(updated)
          }
        }
      } catch (err) {
        console.error("Error fetching notification:", err)
        setError(err instanceof Error ? err.message : "Failed to load notification")
      } finally {
        setLoading(false)
      }
    }

    fetchNotification()
  }, [connected, walletAddress, notificationId])

  const handleAccept = async () => {
    if (!notification || processing) return

    setProcessing(true)
    try {
      const response = await fetch(
        buildApiUrl(`/notifications/${notification.id}/accept`),
        {
          method: "PUT",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to accept notification")
      }

      const updated = await response.json()
      setNotification(updated)

      // Redirect to notifications list after a short delay
      setTimeout(() => {
        router.push("/notifications")
      }, 1500)
    } catch (err) {
      console.error("Error accepting notification:", err)
      setError(err instanceof Error ? err.message : "Failed to accept notification")
    } finally {
      setProcessing(false)
    }
  }

  const handleDecline = async () => {
    if (!notification || processing) return

    setProcessing(true)
    try {
      const response = await fetch(
        buildApiUrl(`/notifications/${notification.id}/decline`),
        {
          method: "PUT",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to decline notification")
      }

      // Redirect to notifications list
      router.push("/notifications")
    } catch (err) {
      console.error("Error declining notification:", err)
      setError(err instanceof Error ? err.message : "Failed to decline notification")
    } finally {
      setProcessing(false)
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

  if (error || !notification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-slate-400 mb-4">{error || "Notification not found"}</p>
          <Link href="/notifications">
            <Button variant="web3">Go Back</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const voucherDetail = notification.voucher_detail || {}
  const imageUrl = (typeof voucherDetail.imageUrl === 'string' ? voucherDetail.imageUrl : null) ||
    (typeof voucherDetail.image_url === 'string' ? voucherDetail.image_url : null) ||
    undefined
  const description = (typeof voucherDetail.description === 'string' ? voucherDetail.description : null) ||
    notification.content
  const tokenAmount = typeof voucherDetail.tokenAmount === 'number' ? voucherDetail.tokenAmount : undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-slate-100">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-cyan-400">Notification Details</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Notification Info */}
        <Card className="bg-slate-900/50 border-slate-700/50 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-100 mb-2">{notification.title}</h2>
          <p className="text-slate-400 mb-4">{notification.content}</p>
          <div className="text-sm text-slate-500">
            Received: {new Date(notification.created_at).toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            })}
          </div>
          {notification.user_accepted && (
            <div className="mt-2 text-sm text-green-400 flex items-center gap-2">
              <Check className="h-4 w-4" />
              Accepted on {new Date(notification.accepted_at!).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              })}
            </div>
          )}
        </Card>

        {/* Voucher Display */}
        <div className="mb-6">
          <CouponVoucher
            couponDesign={{
              description: description,
              imageUrl: imageUrl,
              tokenAmount: tokenAmount,
            }}
          />

          {/* Action Buttons */}
          <div className="mt-6 flex justify-center">
            {notification.user_accepted ? (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/20 border-2 border-green-400 rounded-lg">
                  <Check className="h-6 w-6 text-green-400" />
                  <span className="text-green-400 font-bold text-lg">Voucher Accepted</span>
                </div>
                <p className="text-slate-400 mt-4">
                  This voucher has been added to your account and is waiting for you to use.
                </p>
              </div>
            ) : (
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleAccept}
                  disabled={processing}
                  variant="web3"
                  size="lg"
                  className="gap-2 bg-green-500/20 hover:bg-green-500/30 border-green-400/50 text-green-400"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Accept Voucher
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDecline}
                  disabled={processing}
                  variant="outline"
                  size="lg"
                  className="gap-2 border-red-400/50 text-red-400 hover:bg-red-500/10"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5" />
                      Decline
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

