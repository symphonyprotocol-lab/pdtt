"use client"

import { useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2 } from "lucide-react"
import Image from "next/image"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { toast } from "sonner"

const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS || "0x123"
const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) || "http://localhost:8000"

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

interface ReceiptViewerProps {
  receiptData: ReceiptData
  imageUrl?: string
  matchedVouchers?: Array<{
    id: string
    voucher_detail: {
      description?: string
      tokenAmount?: number
      imageUrl?: string
    }
    condition?: string
    status?: string
  }>
  usedVoucherIds?: Set<string>
}

export function ReceiptViewer({ receiptData, imageUrl, matchedVouchers, usedVoucherIds }: ReceiptViewerProps) {
  console.log("🎯 ReceiptViewer rendered")
  console.log("🎯 matchedVouchers prop:", matchedVouchers)
  console.log("🎯 matchedVouchers length:", matchedVouchers ? matchedVouchers.length : 0)

  const { signAndSubmitTransaction } = useWallet()
  // toast is imported directly from sonner
  const [claimingVoucherId, setClaimingVoucherId] = useState<string | null>(null)
  const [claimedVouchers, setClaimedVouchers] = useState<string[]>([])

  const handleClaim = useCallback(async (voucherId: string) => {
    if (!voucherId) return

    setClaimingVoucherId(voucherId)
    try {
      // 1. Get claim details from backend
      const response = await fetch(`${API_BASE}/api/vouchers/${voucherId}/claim-details`)
      if (!response.ok) {
        throw new Error("Failed to get claim details")
      }

      const details = await response.json()
      console.log("Claim details:", details)

      // 2. Submit transaction
      const payload: any = {
        data: {
          function: `${MODULE_ADDRESS}::ad_rewards::claim_reward`,
          functionArguments: [
            details.advertiser_addr, // advertiser_addr: address
            Array.from(Buffer.from(details.ad_id)), // ad_id: vector<u8>
            details.index, // index: u64
            details.amount, // amount: u64
            details.proof.map((p: string) => Array.from(Buffer.from(p, 'hex'))), // proof: vector<vector<u8>>
            Array.from(Buffer.from(details.leaf_hash, 'hex')) // leaf_hash: vector<u8>
          ],
        },
      }

      console.log("Submitting transaction:", payload)
      const result = await signAndSubmitTransaction(payload)
      console.log("Transaction result:", result)

      // 3. Mark as used in backend
      await fetch(`${API_BASE}/api/vouchers/${voucherId}/claim`, {
        method: "POST"
      })

      toast.success("Reward claimed successfully!")
      setClaimedVouchers((prev) => {
        const next = new Set(prev)
        next.add(voucherId)
        return Array.from(next)
      })

    } catch (error) {
      console.error("Error claiming reward:", error)
      toast.error("Failed to claim reward. Please try again.")
    } finally {
      setClaimingVoucherId(null)
    }
  }, [signAndSubmitTransaction])

  const formatCurrency = (amount: number | undefined, currency = "MYR") => {
    if (amount === undefined || amount === null) return "-"
    return `${currency} ${amount.toFixed(2)}`
  }

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-"
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

  return (
    <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-cyan-400/30 backdrop-blur-sm max-w-2xl">
      <div className="p-6 space-y-6">
        {/* Receipt Image */}
        {imageUrl && (
          <div className="mb-4 overflow-hidden rounded-lg border border-cyan-400/20">
            <Image
              src={imageUrl}
              alt="Receipt"
              width={600}
              height={400}
              className="h-auto w-full object-contain bg-slate-900/50"
            />
          </div>
        )}

        {/* Store Information */}
        {(receiptData.store?.name || receiptData.store?.company) && (
          <div className="border-b border-cyan-400/20 pb-4">
            <h3 className="text-xl font-bold text-cyan-400 mb-2">
              {receiptData.store?.name || receiptData.store?.company}
            </h3>
            {receiptData.store?.company && receiptData.store?.company !== receiptData.store?.name && (
              <p className="text-slate-300 text-sm">{receiptData.store.company}</p>
            )}
            {receiptData.store?.branch && (
              <p className="text-slate-400 text-sm">Branch: {receiptData.store.branch}</p>
            )}
            {receiptData.store?.address && (
              <p className="text-slate-400 text-sm mt-1">{receiptData.store.address}</p>
            )}
            {receiptData.store?.registration_no && (
              <p className="text-slate-500 text-xs mt-1">Reg: {receiptData.store.registration_no}</p>
            )}
          </div>
        )}

        {/* Invoice Details */}
        {receiptData.invoice && (
          <div className="space-y-4">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-cyan-400/20 pb-3">
              <div>
                {receiptData.invoice.invoice_no && (
                  <p className="text-slate-300">
                    <span className="text-slate-500">Invoice:</span> {receiptData.invoice.invoice_no}
                  </p>
                )}
                {receiptData.invoice.date && (
                  <p className="text-slate-400 text-sm mt-1">
                    {formatDate(receiptData.invoice.date)}
                    {receiptData.invoice.time && ` • ${receiptData.invoice.time}`}
                  </p>
                )}
                {receiptData.invoice.cashier && (
                  <p className="text-slate-500 text-xs mt-1">Cashier: {receiptData.invoice.cashier}</p>
                )}
              </div>
            </div>

            {/* Items */}
            {receiptData.invoice.items && receiptData.invoice.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-cyan-400 font-semibold text-sm mb-2">Items</h4>
                <div className="space-y-2">
                  {receiptData.invoice.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-start py-2 border-b border-slate-700/50 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="text-slate-200">{item.description || "Item"}</p>
                        {item.quantity !== undefined && (
                          <p className="text-slate-500 text-xs mt-1">
                            {item.quantity} {item.unit || "pcs"}
                            {item.unit_price !== undefined && ` × ${formatCurrency(item.unit_price, item.currency)}`}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-slate-200 font-medium">
                          {formatCurrency(item.amount, item.currency)}
                        </p>
                        {item.discount && item.discount > 0 && (
                          <p className="text-green-400 text-xs">-{formatCurrency(item.discount, item.currency)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {receiptData.invoice.summary && (
              <div className="border-t border-cyan-400/20 pt-4 space-y-2">
                {receiptData.invoice.summary.subtotal !== undefined && (
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal</span>
                    <span>{formatCurrency(receiptData.invoice.summary.subtotal, receiptData.meta?.currency)}</span>
                  </div>
                )}
                {receiptData.invoice.summary.discount_total !== undefined &&
                  receiptData.invoice.summary.discount_total > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Discount</span>
                      <span>
                        -{formatCurrency(receiptData.invoice.summary.discount_total, receiptData.meta?.currency)}
                      </span>
                    </div>
                  )}
                {receiptData.invoice.summary.tax !== undefined && receiptData.invoice.summary.tax > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Tax</span>
                    <span>{formatCurrency(receiptData.invoice.summary.tax, receiptData.meta?.currency)}</span>
                  </div>
                )}
                {receiptData.invoice.summary.rounding_adjustment !== undefined &&
                  receiptData.invoice.summary.rounding_adjustment !== 0 && (
                    <div className="flex justify-between text-slate-400 text-sm">
                      <span>Rounding</span>
                      <span>
                        {formatCurrency(receiptData.invoice.summary.rounding_adjustment, receiptData.meta?.currency)}
                      </span>
                    </div>
                  )}
                {receiptData.invoice.summary.total !== undefined && (
                  <div className="flex justify-between text-cyan-400 font-bold text-lg pt-2 border-t border-cyan-400/20">
                    <span>Total</span>
                    <span>{formatCurrency(receiptData.invoice.summary.total, receiptData.meta?.currency)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Payment */}
            {receiptData.invoice.payment && (
              <div className="border-t border-cyan-400/20 pt-4 space-y-2">
                {receiptData.invoice.payment.method && (
                  <div className="flex justify-between text-slate-300">
                    <span>Payment Method</span>
                    <span>{receiptData.invoice.payment.method}</span>
                  </div>
                )}
                {receiptData.invoice.payment.amount_paid !== undefined && (
                  <div className="flex justify-between text-slate-300">
                    <span>Amount Paid</span>
                    <span>
                      {formatCurrency(receiptData.invoice.payment.amount_paid, receiptData.meta?.currency)}
                    </span>
                  </div>
                )}
                {receiptData.invoice.payment.change !== undefined && receiptData.invoice.payment.change > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Change</span>
                    <span>{formatCurrency(receiptData.invoice.payment.change, receiptData.meta?.currency)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Matched Vouchers */}
        {matchedVouchers && matchedVouchers.length > 0 && (
          <div className="border-t border-yellow-400/30 pt-4">
            <h4 className="text-yellow-400 font-bold text-lg mb-3 flex items-center gap-2">
              🎉 Redeemable Vouchers ({matchedVouchers.length})
            </h4>
            <div className="space-y-3">
              {matchedVouchers.map((voucher) => {
                const isClaimed =
                  voucher.status === 'used' ||
                  (usedVoucherIds && usedVoucherIds.has(voucher.id)) ||
                  claimedVouchers.includes(voucher.id)

                return (
                  <div
                    key={voucher.id}
                    className="bg-gradient-to-r from-slate-800 to-slate-900 border border-yellow-400/30 rounded-xl overflow-hidden relative group"
                  >
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="p-4 relative z-10">
                      <div className="flex gap-4">
                        {/* Left: Image */}
                        <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-yellow-400/20 bg-slate-950 relative">
                          {voucher.voucher_detail.imageUrl ? (
                            <Image
                              src={voucher.voucher_detail.imageUrl}
                              alt="Voucher"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                              <div className="text-4xl">🎁</div>
                            </div>
                          )}
                        </div>

                        {/* Middle: Info */}
                        <div className="flex-1 min-w-0 py-1">
                          <h5 className="text-yellow-400 font-bold text-xs leading-tight mb-2">
                            {voucher.voucher_detail.description}
                          </h5>
                          <p className="text-slate-400 text-xs line-clamp-2">
                            {voucher.condition}
                          </p>
                        </div>

                        {/* Right: Bonus Token Badge */}
                        <div className="flex-shrink-0 flex flex-col items-center justify-center pl-2">
                          <div className="relative group/token cursor-help">
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-yellow-400/30 blur-xl rounded-full opacity-50 animate-pulse"></div>

                            {/* Token Coin */}
                            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 p-0.5 shadow-lg shadow-orange-500/20 transform group-hover/token:scale-105 transition-transform duration-300">
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex flex-col items-center justify-center border-2 border-yellow-200/50">
                                <span className="text-[10px] font-bold text-yellow-100 uppercase tracking-wider -mb-1">Bonus</span>
                                <span className="text-xl font-black text-white drop-shadow-md">
                                  {voucher.voucher_detail.tokenAmount}
                                </span>
                                <span className="text-[10px] font-bold text-yellow-100">SYM</span>
                              </div>

                              {/* Shine reflection */}
                              <div className="absolute top-0 left-0 w-full h-full rounded-full bg-gradient-to-tr from-white/40 to-transparent opacity-50 pointer-events-none"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        className={`w-full mt-4 font-bold h-10 transition-all duration-300 ${isClaimed
                          ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-default"
                          : "bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-300 hover:via-orange-400 hover:to-red-400 text-white shadow-lg shadow-orange-500/20 border-none"
                          }`}
                        onClick={() => !isClaimed && handleClaim(voucher.id)}
                        disabled={claimingVoucherId === voucher.id || isClaimed}
                      >
                        {claimingVoucherId === voucher.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Claiming Reward...
                          </>
                        ) : isClaimed ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Reward Claimed
                          </>
                        ) : (
                          <span className="flex items-center">
                            Claim Bonus Reward
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        {receiptData.footer?.thank_you_message && (
          <div className="border-t border-cyan-400/20 pt-4 text-center">
            <p className="text-slate-400 text-sm italic">{receiptData.footer.thank_you_message}</p>
          </div>
        )}

        {/* Meta Info */}
        {receiptData.meta?.extracted_at && (
          <div className="border-t border-slate-700/50 pt-3 mt-4">
            <p className="text-slate-600 text-xs text-center">
              Extracted {formatDate(receiptData.meta.extracted_at)} • {receiptData.meta.ocr_engine || "OCR"}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

