"use client"

import { useState, useMemo, useEffect } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Share2, ChevronRight, User, Wallet, Ticket } from "lucide-react"
import Link from "next/link"
import { truncateAddress } from "@aptos-labs/wallet-adapter-react"

const API_BASE =
  (process.env.NEXT_PUBLIC_BACKEND_URL &&
    process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) ||
  ""
const buildApiUrl = (path: string) => `${API_BASE}/api${path}`

interface SettingsItem {
  id: string
  name: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
}

interface Interest {
  name: string
  model: string
}

interface UserPortrait {
  wallet_address: string
  interests: Interest[]
  estimated_age: number | null
  purchase_behaviors: {
    spending_level?: string
    frequency?: string
    preferred_time?: string
    store_preference?: string
    category_diversity?: string
  }
  description: string | null
}

interface UserPortraitResponse {
  portrait: UserPortrait | null
}

export default function SettingsPage() {
  const { account, connected } = useWallet()
  const [userPortrait, setUserPortrait] = useState<UserPortrait | null>(null)
  const [portraitLoading, setPortraitLoading] = useState(true)

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
      setPortraitLoading(false)
      return
    }

    const fetchUserPortrait = async () => {
      setPortraitLoading(true)
      try {
        const response = await fetch(buildApiUrl(`/user-portrait/${walletAddress}`))
        if (response.ok) {
          const data: UserPortraitResponse = await response.json()
          setUserPortrait(data.portrait)
        }
      } catch (err) {
        console.error("Error fetching user portrait:", err)
      } finally {
        setPortraitLoading(false)
      }
    }

    fetchUserPortrait()
  }, [connected, walletAddress])

  const settingsItems: SettingsItem[] = [
    {
      id: "share-to-earn",
      name: "Share To Earn",
      icon: <Share2 className="h-5 w-5" />,
      href: "/share-to-earn",
    },
    {
      id: "my-vouchers",
      name: "My Vouchers",
      icon: <Ticket className="h-5 w-5" />,
      href: "/my-vouchers",
    },
  ]

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Connect Your Wallet</h2>
          <p className="text-slate-400 mb-4">Please connect your wallet to access settings.</p>
          <Link href="/">
            <Button variant="web3">Go to Chat</Button>
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
            <h1 className="text-2xl font-bold text-cyan-400">Settings</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* User Information Card */}
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-400/30 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-slate-400 text-sm mb-1">Wallet Address</div>
              <div className="text-xl font-bold text-cyan-400 font-mono">
                {account?.ansName || truncateAddress(walletAddress || "") || "Unknown"}
              </div>
              {account?.ansName && (
                <div className="text-sm text-slate-500 font-mono mt-1">
                  {truncateAddress(walletAddress || "")}
                </div>
              )}
              {/* User Portrait */}
              <div className="mt-4 pt-4 border-t border-cyan-400/20">
                <div className="text-slate-400 text-sm mb-3">User Portrait</div>
                {portraitLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing your shopping profile...</span>
                  </div>
                ) : userPortrait ? (
                  <div className="space-y-3">
                    {/* Description */}
                    {userPortrait.description && (
                      <div className="text-slate-200 text-sm leading-relaxed">
                        {userPortrait.description}
                      </div>
                    )}
                    
                    {/* Estimated Age */}
                    {userPortrait.estimated_age && (
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <User className="h-4 w-4 text-cyan-400" />
                        <span>Estimated Age: <span className="text-cyan-400 font-medium">{userPortrait.estimated_age}</span></span>
                      </div>
                    )}
                    
                    {/* Interests */}
                    {userPortrait.interests && userPortrait.interests.length > 0 && (
                      <div>
                        <div className="text-slate-400 text-xs mb-2">Interests ({userPortrait.interests.length})</div>
                        <div className="flex flex-wrap gap-2">
                          {userPortrait.interests.map((interest, idx) => (
                            <div key={idx} className="relative group">
                              <span
                                className="px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-300 text-xs border border-cyan-400/30 flex items-center gap-1"
                              >
                                {interest.name}
                                {interest.model && (
                                  <span className="ml-1 px-1 py-0.5 rounded bg-purple-500/30 text-purple-300 text-[10px] border border-purple-400/30" title={`Generated by ${interest.model}`}>
                                    CSM
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Purchase Behaviors */}
                    {userPortrait.purchase_behaviors && Object.keys(userPortrait.purchase_behaviors).length > 0 && (
                      <div>
                        <div className="text-slate-400 text-xs mb-2">Purchase Behaviors</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {userPortrait.purchase_behaviors.spending_level && (
                            <div className="text-slate-300">
                              Spending: <span className="text-cyan-400">{userPortrait.purchase_behaviors.spending_level}</span>
                            </div>
                          )}
                          {userPortrait.purchase_behaviors.frequency && (
                            <div className="text-slate-300">
                              Frequency: <span className="text-cyan-400">{userPortrait.purchase_behaviors.frequency}</span>
                            </div>
                          )}
                          {userPortrait.purchase_behaviors.preferred_time && (
                            <div className="text-slate-300">
                              Preferred Time: <span className="text-cyan-400">{userPortrait.purchase_behaviors.preferred_time}</span>
                            </div>
                          )}
                          {userPortrait.purchase_behaviors.store_preference && (
                            <div className="text-slate-300">
                              Store Type: <span className="text-cyan-400">{userPortrait.purchase_behaviors.store_preference}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <User className="h-4 w-4" />
                    <span>No portrait data yet. Upload receipts to generate your shopping profile.</span>
                  </div>
                )}
              </div>
            </div>
            <Wallet className="h-6 w-6 text-cyan-400/50" />
          </div>
        </Card>

        {/* Settings List */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <div className="divide-y divide-slate-700/50">
            {settingsItems.map((item, index) => {
              const content = (
                <div className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="text-cyan-400">{item.icon}</div>
                    <span className="text-slate-200 font-medium">{item.name}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              )

              if (item.href) {
                return (
                  <div key={item.id}>
                    {index > 0 && <div className="border-t border-slate-700/50"></div>}
                    <Link href={item.href}>
                      {content}
                    </Link>
                  </div>
                )
              }

              return (
                <div key={item.id}>
                  {index > 0 && <div className="border-t border-slate-700/50"></div>}
                  <div onClick={item.onClick}>
                    {content}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

