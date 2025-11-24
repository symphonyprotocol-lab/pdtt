"use client";

import { ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";

interface CouponDesign {
  description: string;
  imageUrl?: string;
  tokenAmount?: number;
}

interface CouponVoucherProps {
  couponDesign: CouponDesign;
}

export function CouponVoucher({ couponDesign }: CouponVoucherProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Reset image state when imageUrl changes
  useEffect(() => {
    if (couponDesign.imageUrl) {
      setImageError(false);
      setImageLoading(true);
    } else {
      setImageLoading(false);
    }
  }, [couponDesign.imageUrl]);

  const hasImage = couponDesign.imageUrl && !imageError;

  if (!couponDesign.imageUrl) {
    return (
      <div className="border rounded-lg p-4 bg-slate-800/50">
        <div className="aspect-video bg-slate-700 rounded flex items-center justify-center">
          <ImageIcon className="h-12 w-12 text-slate-500" />
          <span className="ml-2 text-slate-500">No image generated</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Movie Ticket Style Coupon Voucher */}
      <div className="relative bg-gradient-to-br from-white via-cyan-50 to-purple-50 rounded-l-2xl overflow-hidden shadow-2xl border-2 border-cyan-300/50 flex flex-row w-full max-w-full">
        {/* Left Side - Content */}
        <div className="flex-1 min-w-[350px] w-full p-4 flex flex-col justify-between relative h-[200px]">
          {/* Perforated edge on the right */}
          <div className="absolute right-0 top-0 bottom-0 w-8 flex flex-col items-center justify-center gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1 h-1 bg-slate-400 rounded-full"></div>
            ))}
          </div>

          {/* Header */}
          <div className="flex-shrink-0">
            <div className="inline-block px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full mb-2">
              <span className="text-white font-bold text-xs uppercase tracking-wide">Special Offer</span>
            </div>
            <div className="flex items-center justify-between mb-1 mr-4">
              <h3 className="text-xl font-bold text-slate-800">Coupon Voucher</h3>
              {couponDesign.tokenAmount && (
                <div className="inline-block px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full shadow-lg">
                  <span className="text-white font-bold text-sm">🎁 {couponDesign.tokenAmount} SYM</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-600 line-clamp-2">{couponDesign.description}</p>
          </div>

          {/* Details Section */}
          <div className="space-y-1.5 mt-auto flex-shrink-0">
            <div className="flex items-center gap-2 text-slate-700">
              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full flex-shrink-0"></div>
              <span className="text-xs font-semibold">Valid for redemption</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0"></div>
              <span className="text-xs">Present at checkout</span>
            </div>
            <div className="pt-2 border-t border-slate-300">
              <p className="text-xs text-slate-500">Terms and conditions apply</p>
            </div>
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="h-[200px] w-[200px] bg-gradient-to-br from-slate-50 to-slate-100 p-3 flex items-center justify-center relative flex-shrink-0">
          {/* Decorative corner on top-right */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg z-10"></div>
          {/* Decorative corner on bottom-right */}
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-400 rounded-br-lg z-10"></div>

          {/* Image Container */}
          <div className="relative w-full h-full bg-white rounded-lg overflow-hidden shadow-lg border-2 border-cyan-200/50">
            {hasImage && (
              <img
                key={couponDesign.imageUrl}
                src={couponDesign.imageUrl}
                alt="Coupon Design"
                className="w-full h-full object-contain p-3"
                crossOrigin="anonymous"
                loading="lazy"
                onLoad={() => {
                  setImageLoading(false);
                  setImageError(false);
                }}
                onError={(e) => {
                  console.error("Failed to load image:", couponDesign.imageUrl);
                  setImageError(true);
                  setImageLoading(false);
                  const target = e.target as HTMLImageElement;
                  if (target) {
                    target.style.display = 'none';
                  }
                }}
                style={{
                  display: imageError ? 'none' : 'block',
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
              />
            )}
            {(imageLoading || imageError || !hasImage) && (
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-3 bg-white z-0">
                {imageLoading && hasImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                    <span className="text-xs text-slate-500">Loading image...</span>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="h-12 w-12 text-slate-400" />
                    <span className="text-xs text-slate-500 mt-2 text-center">
                      {imageError ? 'Failed to load image' : 'No image available'}
                    </span>
                    {imageError && couponDesign.imageUrl && (
                      <span className="text-xs text-slate-400 mt-1 text-center break-all px-2">
                        URL: {couponDesign.imageUrl.substring(0, 50)}...
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

