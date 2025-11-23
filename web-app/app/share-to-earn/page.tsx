"use client"

import { useEffect, useState, useMemo } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Check, X, Shield } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"

const API_BASE =
  (process.env.NEXT_PUBLIC_BACKEND_URL &&
    process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) ||
  ""
const buildApiUrl = (path: string) => `${API_BASE}/api${path}`

interface Category {
  id: string
  name: string
  display_order: number
  subcategories: Array<{
    id: string
    name: string
    display_order: number
  }>
}

interface CategoriesResponse {
  categories: Category[]
}

interface ShareToEarnSettings {
  wallet_address: string
  agreed: boolean
  selected_categories: Record<string, boolean>
}

interface ShareToEarnSettingsResponse {
  settings: ShareToEarnSettings
}

export default function ShareToEarnPage() {
  const { account, connected } = useWallet()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<ShareToEarnSettings | null>(null)
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

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [categoriesResponse, settingsResponse] = await Promise.all([
          fetch(buildApiUrl("/categories")),
          fetch(buildApiUrl(`/share-to-earn/${walletAddress}`)),
        ])

        if (!categoriesResponse.ok) {
          throw new Error("Failed to fetch categories")
        }
        if (!settingsResponse.ok) {
          throw new Error("Failed to fetch settings")
        }

        const categoriesData: CategoriesResponse = await categoriesResponse.json()
        const settingsData: ShareToEarnSettingsResponse = await settingsResponse.json()

        setCategories(categoriesData.categories)
        setSettings(settingsData.settings)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [connected, walletAddress])

  const handleAgree = async () => {
    if (!walletAddress) return

    setSaving(true)
    try {
      const response = await fetch(buildApiUrl(`/share-to-earn/${walletAddress}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agreed: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update settings")
      }

      const data: ShareToEarnSettingsResponse = await response.json()
      setSettings(data.settings)
    } catch (err) {
      console.error("Error updating settings:", err)
      setError(err instanceof Error ? err.message : "Failed to update settings")
    } finally {
      setSaving(false)
    }
  }

  const handleCategoryToggle = async (categoryId: string, checked: boolean) => {
    if (!walletAddress || !settings) return

    const newSelectedCategories = {
      ...settings.selected_categories,
      [categoryId]: checked,
    }

    setSaving(true)
    try {
      const response = await fetch(buildApiUrl(`/share-to-earn/${walletAddress}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selected_categories: newSelectedCategories,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update settings")
      }

      const data: ShareToEarnSettingsResponse = await response.json()
      setSettings(data.settings)
    } catch (err) {
      console.error("Error updating settings:", err)
      setError(err instanceof Error ? err.message : "Failed to update settings")
    } finally {
      setSaving(false)
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Connect Your Wallet</h2>
          <p className="text-slate-400 mb-4">Please connect your wallet to access Share To Earn.</p>
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
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-slate-100">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-cyan-400">Share To Earn</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Agreement Status Card */}
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-400/30 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                settings?.agreed 
                  ? "bg-green-500/20 border-2 border-green-400" 
                  : "bg-red-500/20 border-2 border-red-400"
              }`}>
                {settings?.agreed ? (
                  <Check className="h-6 w-6 text-green-400" />
                ) : (
                  <X className="h-6 w-6 text-red-400" />
                )}
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Share To Earn Status</div>
                <div className={`text-xl font-bold ${
                  settings?.agreed ? "text-green-400" : "text-red-400"
                }`}>
                  {settings?.agreed ? "Agreed" : "Not Agreed"}
                </div>
              </div>
            </div>
            {!settings?.agreed && (
              <Button
                onClick={handleAgree}
                disabled={saving}
                variant="web3"
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Agree to Share
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Categories List */}
        {settings?.agreed ? (
          <Card className="bg-slate-900/50 border-slate-700/50">
            <div className="p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-cyan-400 mb-2">Select Categories to Share</h2>
              <p className="text-slate-400 text-sm">
                Choose which categories you want to share. Only selected categories will be shared to the platform.
              </p>
            </div>
            <div className="divide-y divide-slate-700/50">
              {categories.map((category) => {
                const isSelected = settings.selected_categories[category.id] || false
                const subcategoryNames = category.subcategories
                  .map((sub) => sub.name)
                  .join(", ")
                return (
                  <div
                    key={category.id}
                    className="p-4 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleCategoryToggle(category.id, checked === true)
                        }
                        disabled={saving}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-slate-200 font-medium mb-1">
                          {category.name}
                        </div>
                        {subcategoryNames && (
                          <div className="text-slate-400 text-sm">
                            {subcategoryNames}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="text-green-400 text-sm font-medium">Sharing</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        ) : (
          <Card className="bg-slate-900/50 border-slate-700/50 p-6">
            <div className="text-center py-8">
              <Shield className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-300 mb-2">
                Agree to Share To Earn
              </h3>
              <p className="text-slate-400 mb-6">
                Please agree to Share To Earn to start selecting categories to share.
              </p>
              <Button onClick={handleAgree} disabled={saving} variant="web3" className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Agree to Share
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

