"use client"

import { useEffect, useState, useMemo } from "react"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Lightbulb, PieChart, Calendar, Share2, Shield } from "lucide-react"
import { ReceiptViewer } from "@/components/receipt-viewer"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const API_BASE =
  (process.env.NEXT_PUBLIC_BACKEND_URL &&
    process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) ||
  ""
const buildApiUrl = (path: string) => `${API_BASE}/api${path}`

interface ReceiptData {
  meta?: {
    source_image?: string
    extracted_at?: string
    ocr_engine?: string
    language?: string
    currency?: string
  }
  store?: {
    name?: string
    company?: string
    registration_no?: string
    branch?: string
    address?: string
    phone?: string
    email?: string
    website?: string
  }
  invoice?: {
    invoice_no?: string
    order_no?: string
    date?: string
    time?: string
    cashier?: string
    buyer_tin?: string
    e_invoice_uuid?: string
    items?: Array<{
      description?: string
      barcode?: string
      quantity?: number
      unit?: string
      unit_price?: number
      discount?: number
      amount?: number
      currency?: string
    }>
    summary?: {
      subtotal?: number
      discount_total?: number
      tax?: number
      rounding_adjustment?: number
      total?: number
    }
    payment?: {
      method?: string
      amount_paid?: number
      change?: number
      card_type?: string
      transaction_id?: string
    }
  }
  footer?: {
    thank_you_message?: string
    notes?: string
    socials?: {
      facebook?: string
      instagram?: string
      wechat?: string
      tiktok?: string
      web?: string
    }
    contact?: {
      phone?: string
      email?: string
    }
  }
}

interface Receipt {
  id: string
  walletAddress: string
  sourceImageUrl: string
  receiptData: ReceiptData
  createdAt: string
}

interface MonthlySpendingResponse {
  walletAddress: string
  monthly_data: Record<string, {
    month: string
    total: number
    transaction_count: number
    categories: Record<string, number>
  }>
  category_totals: Record<string, number>
  savings_insights: Array<{
    type: string
    message: string
    category?: string
    amount?: number
    month?: string
    count?: number
  }>
}

interface ReceiptsResponse {
  walletAddress: string
  receipts: Receipt[]
  stats: {
    total_receipts: number
    total_amount: number
    currency_counts: Record<string, number>
    store_counts: Record<string, number>
    average_amount: number
  }
}

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

export default function ReceiptsPage() {
  const { account, connected } = useWallet()
  const router = useRouter()
  const [spendingData, setSpendingData] = useState<MonthlySpendingResponse | null>(null)
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

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
        // Fetch spending data, receipts, and categories
        const [spendingResponse, receiptsResponse, categoriesResponse] = await Promise.all([
          fetch(buildApiUrl(`/spending/${walletAddress}`)),
          fetch(buildApiUrl(`/receipts/${walletAddress}`)),
          fetch(buildApiUrl(`/categories`)),
        ])

        if (!spendingResponse.ok) {
          throw new Error("Failed to fetch spending data")
        }
        if (!receiptsResponse.ok) {
          throw new Error("Failed to fetch receipts")
        }
        if (!categoriesResponse.ok) {
          console.warn("Failed to fetch categories, using defaults")
        }

        const spendingData: MonthlySpendingResponse = await spendingResponse.json()
        const receiptsData: ReceiptsResponse = await receiptsResponse.json()
        const categoriesData: CategoriesResponse = categoriesResponse.ok 
          ? await categoriesResponse.json()
          : { categories: [] }

        setSpendingData(spendingData)
        setAllReceipts(receiptsData.receipts)
        setCategories(categoriesData.categories)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [connected, walletAddress])

  const formatCurrency = (amount: number, currency = "MYR") => {
    return `${currency} ${amount.toFixed(2)}`
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  const getCategoryColor = (category: string) => {
    // Color palette for categories - assign colors based on category name or index
    const colorPalette = [
      "from-orange-500/20 to-red-500/20 border-orange-400/30",
      "from-green-500/20 to-emerald-500/20 border-green-400/30",
      "from-purple-500/20 to-pink-500/20 border-purple-400/30",
      "from-blue-500/20 to-cyan-500/20 border-blue-400/30",
      "from-yellow-500/20 to-amber-500/20 border-yellow-400/30",
      "from-indigo-500/20 to-violet-500/20 border-indigo-400/30",
      "from-teal-500/20 to-cyan-500/20 border-teal-400/30",
      "from-rose-500/20 to-pink-500/20 border-rose-400/30",
      "from-lime-500/20 to-green-500/20 border-lime-400/30",
      "from-amber-500/20 to-orange-500/20 border-amber-400/30",
      "from-sky-500/20 to-blue-500/20 border-sky-400/30",
      "from-slate-500/20 to-gray-500/20 border-slate-400/30",
    ]
    
    // Try to find category in database categories
    const categoryIndex = categories.findIndex(cat => cat.name === category)
    if (categoryIndex >= 0) {
      return colorPalette[categoryIndex % colorPalette.length]
    }
    
    // Fallback to hash-based color assignment
    let hash = 0
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colorPalette[Math.abs(hash) % colorPalette.length]
  }

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0
    return (value / total) * 100
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Connect Your Wallet</h2>
          <p className="text-slate-400 mb-4">Please connect your wallet to view your spending report.</p>
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

  // Filter receipts by selected month (matching backend logic)
  const monthReceipts = selectedMonth
    ? allReceipts.filter((receipt) => {
        const receiptData = receipt.receiptData
        const receiptDateStr = receiptData?.invoice?.date
        
        let receiptDate: Date
        if (receiptDateStr) {
          try {
            // Try parsing as YYYY-MM-DD format (same as backend)
            const [year, month, day] = receiptDateStr.split("-").map(Number)
            if (year && month && day) {
              receiptDate = new Date(year, month - 1, day)
            } else {
              receiptDate = new Date(receipt.createdAt)
            }
          } catch {
            receiptDate = new Date(receipt.createdAt)
          }
        } else {
          receiptDate = new Date(receipt.createdAt)
        }
        
        // Format as YYYY-MM (same as backend)
        const receiptMonthKey = `${receiptDate.getFullYear()}-${String(receiptDate.getMonth() + 1).padStart(2, "0")}`
        return receiptMonthKey === selectedMonth
      })
    : []

  if (selectedReceipt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        {/* Sticky Back Button */}
        <div className="sticky top-0 z-30 border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm">
          <div className="container mx-auto max-w-4xl px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedReceipt(null)}
              className="text-slate-400 hover:text-cyan-400"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {selectedMonth ? "Back to Receipts" : "Back to Report"}
            </Button>
          </div>
        </div>
        {/* Receipt Content */}
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <ReceiptViewer receiptData={selectedReceipt.receiptData} imageUrl={selectedReceipt.sourceImageUrl} />
        </div>
      </div>
    )
  }

  // Show receipts list for selected month
  if (selectedMonth && spendingData) {
    const monthData = spendingData.monthly_data[selectedMonth]
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm">
          <div className="container mx-auto max-w-4xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedMonth(null)}
                  className="text-slate-400 hover:text-cyan-400"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Report
                </Button>
                <Calendar className="h-5 w-5 text-cyan-400" />
                <h1 className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-xl font-bold text-transparent">
                  {monthData?.month || selectedMonth}
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Month Summary */}
          {monthData && (
            <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-400/30 p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-slate-400 text-sm mb-1">Total Spending</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {formatCurrency(monthData.total)}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">
                    {monthData.transaction_count} {monthData.transaction_count === 1 ? "transaction" : "transactions"}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Receipts List */}
          {monthReceipts.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-slate-400">No receipts found for this month.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {monthReceipts.map((receipt) => {
                const receiptData = receipt.receiptData
                const storeName = receiptData?.store?.name || receiptData?.store?.company || "Unknown Store"
                const total = receiptData?.invoice?.summary?.total || 0
                const currency = receiptData?.meta?.currency || "MYR"
                const date = receiptData?.invoice?.date || receipt.createdAt

                return (
                  <Card
                    key={receipt.id}
                    className="bg-slate-800/50 border-slate-700/50 hover:border-cyan-400/50 transition-colors cursor-pointer overflow-hidden"
                    onClick={() => setSelectedReceipt(receipt)}
                  >
                    <div className="relative h-48 bg-slate-900/50">
                      <Image
                        src={receipt.sourceImageUrl}
                        alt={storeName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-200 mb-1 truncate">{storeName}</h3>
                      <p className="text-sm text-slate-400 mb-2">{formatDate(date)}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-cyan-400">
                          {formatCurrency(total, currency)}
                        </span>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-cyan-400">
                          View Details
                        </Button>
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

  if (!spendingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-slate-600" />
          <h3 className="text-xl font-bold text-slate-200 mb-2">No Spending Data</h3>
          <p className="text-slate-400 mb-6">Upload receipts to start tracking your spending!</p>
          <Link href="/">
            <Button variant="web3">Go to Chat</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const totalSpending = Object.values(spendingData.category_totals).reduce((sum, val) => sum + val, 0)
  const monthlyEntries = Object.entries(spendingData.monthly_data).sort((a, b) => b[0].localeCompare(a[0]))
  const sortedCategories = Object.entries(spendingData.category_totals).sort((a, b) => b[1] - a[1])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-cyan-400">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <PieChart className="h-5 w-5 text-cyan-400" />
              <h1 className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-xl font-bold text-transparent">
                Monthly Spending Report
              </h1>
            </div>
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="web3" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share To Earn
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-cyan-400/30 max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-cyan-400">
                    <Shield className="h-5 w-5" />
                    Share To Earn - Privacy Protected
                  </DialogTitle>
                  <DialogDescription asChild>
                    <div className="text-slate-300 pt-4 space-y-4">
                      <p>
                        When you share your spending data, we use <strong className="text-cyan-400">zero-knowledge proofs (zkSnake)</strong> to protect your privacy.
                      </p>
                      <div className="bg-slate-800/50 border border-cyan-400/20 rounded-lg p-4 space-y-2">
                        <p className="text-slate-200 font-semibold flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-400" />
                          What We Share:
                        </p>
                        <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
                          <li>Data proofs (verifiable spending patterns)</li>
                          <li>Aggregated statistics (category totals, trends)</li>
                          <li>Anonymized insights</li>
                        </ul>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
                        <p className="text-slate-200 font-semibold flex items-center gap-2">
                          <Shield className="h-4 w-4 text-red-400" />
                          What We DON&apos;T Share:
                        </p>
                        <ul className="list-disc list-inside text-slate-300 space-y-1 ml-2">
                          <li>Raw receipt images</li>
                          <li>Personal details (store names, addresses)</li>
                          <li>Individual transaction details</li>
                          <li>Your wallet address or identity</li>
                        </ul>
                      </div>
                      <p className="text-slate-400 text-sm">
                        Your raw data stays encrypted and private. Only mathematical proofs are shared, allowing you to monetize your data while maintaining complete privacy.
                      </p>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShareDialogOpen(false)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Close
                  </Button>
                  <Button
                    variant="web3"
                    onClick={() => {
                      setShareDialogOpen(false)
                      router.push("/share-to-earn")
                    }}
                  >
                    Share & Earn
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Total Spending Card */}
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-400/30 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-sm mb-1">Total Spending</div>
              <div className="text-3xl font-bold text-cyan-400">
                {formatCurrency(totalSpending)}
              </div>
              <div className="text-slate-500 text-xs mt-1">
                Across {monthlyEntries.length} {monthlyEntries.length === 1 ? "month" : "months"}
              </div>
            </div>
            <TrendingUp className="h-12 w-12 text-cyan-400/50" />
          </div>
        </Card>

        {/* Savings Insights */}
        {spendingData.savings_insights.length > 0 && (
          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-400/30 p-6 mb-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-yellow-400 font-semibold mb-3">Savings Tips</h3>
                <div className="space-y-2">
                  {spendingData.savings_insights.map((insight, idx) => (
                    <p key={idx} className="text-slate-200 text-sm">
                      • {insight.message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Category Breakdown */}
        {sortedCategories.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700/50 p-6 mb-6">
            <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-cyan-400" />
              Spending by Category
            </h3>
            <div className="space-y-3">
              {sortedCategories.map(([category, amount]) => {
                const percentage = calculatePercentage(amount, totalSpending)
                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300 font-medium">{category}</span>
                      <span className="text-cyan-400 font-semibold">{formatCurrency(amount)}</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${getCategoryColor(category).split(" ")[0]} ${getCategoryColor(category).split(" ")[1]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-slate-500 text-xs mt-1">{percentage.toFixed(1)}% of total</div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Monthly Breakdown */}
        {monthlyEntries.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700/50 p-6">
            <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cyan-400" />
              Monthly Breakdown
            </h3>
            <div className="space-y-4">
              {monthlyEntries.map(([monthKey, monthData]) => {
                const prevMonth = monthlyEntries.find(([key]) => {
                  const currentDate = new Date(monthKey + "-01")
                  const prevDate = new Date(currentDate)
                  prevDate.setMonth(prevDate.getMonth() - 1)
                  return key === prevDate.toISOString().slice(0, 7)
                })
                const trend = prevMonth
                  ? monthData.total > prevMonth[1].total
                    ? "up"
                    : monthData.total < prevMonth[1].total
                    ? "down"
                    : "same"
                  : "same"

                return (
                  <div
                    key={monthKey}
                    className="border border-slate-700/50 rounded-lg p-4 bg-slate-900/50 hover:border-cyan-400/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedMonth(monthKey)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-slate-200 font-semibold">{monthData.month}</h4>
                        <p className="text-slate-500 text-sm">
                          {monthData.transaction_count} {monthData.transaction_count === 1 ? "transaction" : "transactions"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-cyan-400">
                          {formatCurrency(monthData.total)}
                        </div>
                        {trend !== "same" && prevMonth && (
                          <div
                            className={`text-xs flex items-center gap-1 mt-1 ${
                              trend === "up" ? "text-red-400" : "text-green-400"
                            }`}
                          >
                            {trend === "up" ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {Math.abs(
                              ((monthData.total - prevMonth[1].total) / prevMonth[1].total) * 100
                            ).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(monthData.categories)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, amount]) => (
                          <div key={cat} className="flex justify-between text-sm">
                            <span className="text-slate-400">{cat}</span>
                            <span className="text-slate-300">{formatCurrency(amount)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
