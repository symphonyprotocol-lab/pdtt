"use client"

import { Card } from "@/components/ui/card"
import Image from "next/image"

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
}

export function ReceiptViewer({ receiptData, imageUrl }: ReceiptViewerProps) {
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

