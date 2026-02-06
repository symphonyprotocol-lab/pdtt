"use client"

import { useEffect, useState, useMemo } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Ticket, CheckCircle2, XCircle, Clock, Check } from "lucide-react"
import Link from "next/link"
import { CouponVoucher } from "@/components/coupon-voucher"

const API_BASE =
  (process.env.NEXT_PUBLIC_BACKEND_URL &&
    process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) ||
  ""
const buildApiUrl = (path: string) => `${API_BASE}/api${path}`

interface UserVoucher {
  id: string
  wallet_address: string
  notification_id: string
  campaign_id: string
  voucher_detail: Record<string, any>
  status: string
  created_at: string
  accepted_at: string | null
  declined_at: string | null
  used_at: string | null
  expired_at: string | null
  target_store?: string | null
  target_item?: string | null
}

interface UserVouchersResponse {
  vouchers: UserVoucher[]
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "wait_to_user":
      return {
        label: "Waiting",
        icon: <Clock className="h-4 w-4" />,
        className: "text-amber-400 bg-amber-500/20 border-amber-400/30",
      }
    case "accepted":
      return {
        label: "Accepted",
        icon: <CheckCircle2 className="h-4 w-4" />,
        className: "text-green-400 bg-green-500/20 border-green-400/30",
      }
    case "declined":
      return {
        label: "Declined",
        icon: <XCircle className="h-4 w-4" />,
        className: "text-red-400 bg-red-500/20 border-red-400/30",
      }
    case "used":
      return {
        label: "Used",
        icon: <Check className="h-4 w-4" />,
        className: "text-blue-400 bg-blue-500/20 border-blue-400/30",
      }
    case "expired":
      return {
        label: "Expired",
        icon: <XCircle className="h-4 w-4" />,
        className: "text-slate-400 bg-slate-500/20 border-slate-400/30",
      }
    default:
      return {
        label: status,
        icon: <Clock className="h-4 w-4" />,
        className: "text-slate-400 bg-slate-500/20 border-slate-400/30",
      }
  }
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return ""

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ""

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (err) {
    return ""
  }
}

export default function MyVouchersPage() {
  const { account, connected } = useWallet()
  const [loading, setLoading] = useState(true)
  const [vouchers, setVouchers] = useState<UserVoucher[]>([])
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

  useEffect(() => {
    if (!connected || !walletAddress) {
      setLoading(false)
      return
    }

    const fetchVouchers = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(buildApiUrl(`/user-vouchers/${walletAddress}`))
        if (!response.ok) {
          throw new Error("Failed to fetch vouchers")
        }

        const data: UserVouchersResponse = await response.json()
        setVouchers(data.vouchers)
        console.log(data.vouchers)
      } catch (err) {
        console.error("Error fetching vouchers:", err)
        setError(err instanceof Error ? err.message : "Failed to load vouchers")
      } finally {
        setLoading(false)
      }
    }

    fetchVouchers()
  }, [connected, walletAddress])

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Connect Your Wallet</h2>
          <p className="text-slate-400 mb-4">Please connect your wallet to view your vouchers.</p>
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
          <Link href="/settings">
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
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-slate-100">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Ticket className="h-6 w-6 text-cyan-400" />
              <h1 className="text-2xl font-bold text-cyan-400">My Vouchers</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {vouchers.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-700/50 p-8">
            <div className="text-center py-8">
              <Ticket className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-300 mb-2">No Vouchers</h3>
              <p className="text-slate-400">You don't have any vouchers yet. Accept notifications to get vouchers.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {vouchers.map((voucher) => {
              const statusBadge = getStatusBadge(voucher.status)
              const imageUrl = voucher.voucher_detail?.imageUrl || voucher.voucher_detail?.image_url
              const description = voucher.voucher_detail?.description || "No description available"
              const tokenAmount = voucher.voucher_detail?.tokenAmount || 0

              return (
                <Card
                  key={voucher.id}
                  className="bg-slate-900/50 border-slate-700/50 overflow-hidden"
                >
                  <div className="p-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${statusBadge.className}`}
                      >
                        {statusBadge.icon}
                        {statusBadge.label}
                      </div>
                      <div className="text-xs text-slate-500">
                        Created: {formatDate(voucher.created_at)}
                      </div>
                    </div>

                    {/* Voucher Display */}
                    <CouponVoucher
                      couponDesign={{
                        description: description,
                        imageUrl: imageUrl,
                        tokenAmount: tokenAmount,
                        targetStore: voucher.target_store,
                        targetItem: voucher.target_item,
                      }}
                    />

                    {/* Additional Info */}
                    <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-500 space-y-1">
                      {voucher.accepted_at && (
                        <div>Accepted: {formatDate(voucher.accepted_at)}</div>
                      )}
                      {voucher.used_at && (
                        <div>Used: {formatDate(voucher.used_at)}</div>
                      )}
                      {voucher.expired_at && (
                        <div>Expired: {formatDate(voucher.expired_at)}</div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

