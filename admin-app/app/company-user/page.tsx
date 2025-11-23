"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@/components/wallet-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, Search, Send, LogOut, Users, User, Image as ImageIcon, Coins, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { CouponVoucher } from "@/components/coupon-voucher";

const WALLET_ROLE_MAP_KEY = "wallet_role_map";
// Default to localhost:8000 if not set (common FastAPI default)
const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) || "http://localhost:8000";
const buildApiUrl = (path: string) => `${API_BASE}/api${path}`;

interface AIResponse {
  targetGroup: string;
  userPortrait: {
    demographics: string;
    interests: string[];
    behavior: string;
    usedModels?: string[];
  };
  couponDesign: {
    description: string;
    imageUrl?: string;
    imagePrompt?: string;
  };
  targetPersonCount?: number;
  targetWalletAddresses?: string[];
}

export default function CompanyUserPage() {
  const { account, connected, disconnect } = useWallet();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [budget, setBudget] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);

  const walletAddress = useMemo(() => {
    const addr = account?.address as unknown;
    if (!addr) return null;
    if (typeof addr === "string") return addr;
    if (typeof addr === "object" && "toString" in addr) {
      const value = (addr as { toString: () => string }).toString();
      return typeof value === "string" ? value : null;
    }
    return null;
  }, [account?.address]);

  useEffect(() => {
    if (!connected) {
      router.push("/login");
      return;
    }

    // Check role
    const walletRoleMap = localStorage.getItem(WALLET_ROLE_MAP_KEY);
    if (walletRoleMap && walletAddress) {
      try {
        const map = JSON.parse(walletRoleMap);
        const role = map[walletAddress];
        if (role !== "company_user") {
          router.push("/login");
          return;
        }
      } catch (e) {
        console.error("Error checking role:", e);
      }
    }
  }, [connected, walletAddress, router]);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    if (!walletAddress) {
      toast.error("Please connect your wallet");
      return;
    }

    setLoading(true);
    setShowResults(false);
    setAiResponse(null);
    
    try {
      const url = buildApiUrl("/campaign/analyze");
      console.log("Calling API:", url);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: walletAddress,
          query: query.trim(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Check if it's an HTML error page (404 from Next.js)
        if (errorText.includes("<!DOCTYPE html>") || errorText.includes("404")) {
          throw new Error(`Backend server not found. Please ensure the backend is running at ${API_BASE} and NEXT_PUBLIC_BACKEND_URL is set correctly.`);
        }
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the JSON response
      let imageUrl = data.couponDesign?.imageUrl || undefined;
      
      // If imageUrl is a DALL-E URL, upload it to Pinata immediately so it's always available
      // (DALL-E URLs expire after ~2 hours, so we need to upload to Pinata for persistence)
      if (imageUrl && (imageUrl.includes("oaidalle") || imageUrl.includes("blob.core.windows.net"))) {
        try {
          console.log("[ANALYSIS] Uploading DALL-E image to Pinata for persistence...");
          const uploadResponse = await fetch("/api/upload-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ imageUrl }),
          });
          
          if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            if (result.url) {
              imageUrl = result.url;
              console.log("[ANALYSIS] ✓ Successfully uploaded to Pinata:", imageUrl);
            } else {
              console.error("[ANALYSIS] No URL in response:", result);
              // Keep DALL-E URL as fallback (may expire)
            }
          } else {
            const error = await uploadResponse.json().catch(() => ({ error: "Unknown error" }));
            console.error("[ANALYSIS] Failed to upload to Pinata:", error);
            // Keep DALL-E URL as fallback (may expire)
          }
        } catch (uploadError) {
          console.error("[ANALYSIS] Error uploading to Pinata:", uploadError);
          // Keep DALL-E URL as fallback (may expire)
        }
      }
      
      const parsedResponse: AIResponse = {
        targetGroup: data.targetGroup || "Target Group",
        userPortrait: {
          demographics: data.userPortrait?.demographics || "",
          interests: Array.isArray(data.userPortrait?.interests) 
            ? data.userPortrait.interests 
            : [],
          behavior: data.userPortrait?.behavior || "",
          usedModels: Array.isArray(data.userPortrait?.usedModels) && data.userPortrait.usedModels.length > 0
            ? data.userPortrait.usedModels
            : ["Customer Segmentation Model"],
        },
        couponDesign: {
          description: data.couponDesign?.description || "",
          imageUrl: imageUrl,
          imagePrompt: data.couponDesign?.imagePrompt || undefined,
        },
        targetPersonCount: data.targetPersonCount || 0,
        targetWalletAddresses: Array.isArray(data.targetWalletAddresses) 
          ? data.targetWalletAddresses 
          : [],
      };
      
      setAiResponse(parsedResponse);
      setShowResults(true);
      toast.success("AI analysis complete!");
    } catch (error) {
      console.error("Error searching:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process your request";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!aiResponse?.couponDesign?.imagePrompt) {
      toast.error("Image prompt not available");
      return;
    }

    setRegeneratingImage(true);
    try {
      // Call backend to regenerate image
      const response = await fetch(buildApiUrl("/campaign/regenerate-image"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imagePrompt: aiResponse.couponDesign.imagePrompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const dallEUrl = data.imageUrl;

      if (!dallEUrl) {
        throw new Error("No image URL returned");
      }

      // Upload to Pinata
      console.log("[REGENERATE] Uploading regenerated image to Pinata...");
      const uploadResponse = await fetch("/api/upload-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl: dallEUrl }),
      });

      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        if (result.url) {
          // Update the coupon design with new image URL
          setAiResponse({
            ...aiResponse,
            couponDesign: {
              ...aiResponse.couponDesign,
              imageUrl: result.url,
            },
          });
          toast.success("Voucher image regenerated successfully!");
        } else {
          throw new Error("Failed to get Pinata URL");
        }
      } else {
        // Use DALL-E URL as fallback
        setAiResponse({
          ...aiResponse,
          couponDesign: {
            ...aiResponse.couponDesign,
            imageUrl: dallEUrl,
          },
        });
        toast.warning("Image regenerated but Pinata upload failed, using temporary URL");
      }
    } catch (error) {
      console.error("Error regenerating image:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to regenerate image";
      toast.error(errorMessage);
    } finally {
      setRegeneratingImage(false);
    }
  };

  const handleStartCampaign = async () => {
    if (!budget.trim() || !aiResponse) {
      toast.error("Please enter a budget");
      return;
    }

    if (!walletAddress) {
      toast.error("Please connect your wallet");
      return;
    }

    const budgetAmount = parseFloat(budget);
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    try {
      // Calculate token reward amount
      const targetPersonCount = aiResponse.targetPersonCount || 0;
      const tokenAmount = budgetAmount > 0 && targetPersonCount > 0
        ? Math.round((budgetAmount * 0.3) / targetPersonCount)
        : 20;
      
      // Prepare coupon design - ensure Pinata URL is used and update description with token amount
      const couponDesign = { 
        ...aiResponse.couponDesign,
        description: `${aiResponse.couponDesign.description} Each voucher rewards ${tokenAmount} SYM tokens upon successful redemption.`
      };
      
      // If imageUrl is still a DALL-E URL (shouldn't happen if analysis upload worked, but handle it anyway)
      const imageUrl = couponDesign.imageUrl;
      if (imageUrl && (imageUrl.includes("oaidalle") || imageUrl.includes("blob.core.windows.net"))) {
        try {
          console.log("[CAMPAIGN_START] Uploading voucher image to Pinata...");
          toast.info("Uploading voucher image to Pinata...");
          
          const uploadResponse = await fetch("/api/upload-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ imageUrl }),
          });
          
          if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            if (result.url) {
              couponDesign.imageUrl = result.url;
              console.log("[CAMPAIGN_START] ✓ Successfully uploaded to Pinata:", result.url);
              toast.success("Voucher image uploaded successfully!");
            } else {
              console.error("[CAMPAIGN_START] No URL in response:", result);
              toast.warning("Failed to get Pinata URL, using original image URL");
            }
          } else {
            const error = await uploadResponse.json().catch(() => ({ error: "Unknown error" }));
            console.error("[CAMPAIGN_START] Failed to upload to Pinata:", error);
            toast.warning("Failed to upload to Pinata, using original image URL");
            // Keep DALL-E URL as fallback
          }
        } catch (uploadError) {
          console.error("[CAMPAIGN_START] Error uploading to Pinata:", uploadError);
          toast.warning("Error uploading image, using original URL");
          // Keep DALL-E URL as fallback
        }
      } else if (imageUrl && imageUrl.includes("pinata")) {
        // Already a Pinata URL, no need to upload again
        console.log("[CAMPAIGN_START] Image already uploaded to Pinata, using existing URL");
      }

      const url = buildApiUrl("/campaign/create");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: walletAddress,
          query: query.trim(),
          budget: budgetAmount,
          targetGroup: aiResponse.targetGroup,
          userPortrait: {
            ...aiResponse.userPortrait,
            usedModels: aiResponse.userPortrait.usedModels || ["Customer Segmentation Model"],
          },
          couponDesign: couponDesign,
          targetWalletAddresses: aiResponse.targetWalletAddresses || [],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Check if it's an HTML error page (404 from Next.js)
        if (errorText.includes("<!DOCTYPE html>") || errorText.includes("404")) {
          throw new Error(`Backend server not found. Please ensure the backend is running at ${API_BASE} and NEXT_PUBLIC_BACKEND_URL is set correctly.`);
        }
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      toast.success(`Campaign started successfully! Job ID: ${data.jobId || "N/A"}`);
      
      // Reset form
      setQuery("");
      setBudget("");
      setAiResponse(null);
      setShowResults(false);
      
      // Navigate to jobs page
      router.push("/jobs");
    } catch (error) {
      console.error("Error starting campaign:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start campaign";
      toast.error(errorMessage);
    }
  };

  const handleSwitchRole = () => {
    if (!walletAddress) return;
    
    const walletRoleMap = localStorage.getItem(WALLET_ROLE_MAP_KEY);
    let map: Record<string, string> = {};
    if (walletRoleMap) {
      try {
        map = JSON.parse(walletRoleMap);
      } catch (e) {
        console.error("Error parsing wallet role map:", e);
      }
    }
    map[walletAddress] = "model_supplier";
    localStorage.setItem(WALLET_ROLE_MAP_KEY, JSON.stringify(map));
    router.push("/model-supplier");
  };

  const handleLogout = () => {
    disconnect();
    router.push("/login");
  };

  if (!connected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-cyan-400" />
              <h1 className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
                Company User Portal
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/jobs">
                <Button variant="outline">View Jobs</Button>
              </Link>
              <Button variant="outline" onClick={handleSwitchRole}>
                Switch to Model Supplier
              </Button>
              <WalletSelector />
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Search Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-6 w-6" />
                AI Campaign Assistant
              </CardTitle>
              <CardDescription>
                Describe your target customers and campaign goals. Our AI will help you find the perfect audience and design your campaign.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='e.g., "find customers like coffee and give them Nest coffee coupon"'
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !loading) {
                      handleSearch();
                    }
                  }}
                />
                <Button onClick={handleSearch} disabled={loading || !query.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Results */}
          {showResults && aiResponse && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Target Group
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold mb-4">{aiResponse.targetGroup}</p>
                  {aiResponse.targetPersonCount !== undefined && (
                    <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Matching Users Found:</span>
                        <span className="text-2xl font-bold text-cyan-400">
                          {aiResponse.targetPersonCount.toLocaleString()}
                        </span>
                      </div>
                      {aiResponse.targetWalletAddresses && aiResponse.targetWalletAddresses.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-cyan-400/20">
                          <p className="text-xs text-slate-400 mb-2">Sample Wallet Addresses:</p>
                          <p className="text-xs font-mono text-slate-300">
                            {aiResponse.targetWalletAddresses.slice(0, 5).map((address, idx) => {
                              // Truncate address: show first 6 chars and last 4 chars
                              const truncated = address.length > 10 
                                ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
                                : address;
                              const addresses = aiResponse.targetWalletAddresses || [];
                              return (
                                <span key={idx}>
                                  {truncated}
                                  {idx < Math.min(addresses.length, 5) - 1 && ", "}
                                </span>
                              );
                            })}
                            {(aiResponse.targetWalletAddresses?.length || 0) > 5 && " ..."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    User Portrait
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Demographics</p>
                    <p className="text-base">{aiResponse.userPortrait.demographics}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {aiResponse.userPortrait.interests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Behavior</p>
                    <p className="text-base">{aiResponse.userPortrait.behavior}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Used Models</p>
                    <div className="flex flex-wrap gap-2">
                      {(aiResponse.userPortrait.usedModels || ["Customer Segmentation Model"]).map((model, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm"
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Coupon Design
                    </CardTitle>
                    {aiResponse.couponDesign.imagePrompt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerateImage}
                        disabled={regeneratingImage}
                        className="gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${regeneratingImage ? 'animate-spin' : ''}`} />
                        {regeneratingImage ? 'Regenerating...' : 'Regenerate Image'}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-base">{aiResponse.couponDesign.description}</p>
                  {/* Calculate and display token reward */}
                  {budget && (aiResponse.targetPersonCount || 0) > 0 && (
                    <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="h-5 w-5 text-cyan-400" />
                        <span className="text-sm font-semibold text-cyan-400">Token Reward per Voucher</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {(() => {
                          const budgetAmount = parseFloat(budget) || 0;
                          const targetPersonCount = aiResponse.targetPersonCount || 0;
                          const tokenAmount = budgetAmount > 0 && targetPersonCount > 0
                            ? Math.round((budgetAmount * 0.3) / targetPersonCount)
                            : 20;
                          return `${tokenAmount} SYM`;
                        })()}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        {budget && parseFloat(budget) > 0
                          ? `30% of budget (${parseFloat(budget) * 0.3}) ÷ ${aiResponse.targetPersonCount || 0} people`
                          : "Default reward amount"}
                      </p>
                    </div>
                  )}
                  {(!budget || !aiResponse.targetPersonCount || aiResponse.targetPersonCount === 0) && (
                    <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="h-5 w-5 text-cyan-400" />
                        <span className="text-sm font-semibold text-cyan-400">Token Reward per Voucher</span>
                      </div>
                      <p className="text-2xl font-bold text-white">20 SYM</p>
                      <p className="text-xs text-slate-400 mt-2">Default reward amount (will update after budget is set)</p>
                    </div>
                  )}
                  <CouponVoucher couponDesign={aiResponse.couponDesign} />
                </CardContent>
              </Card>

              {/* Budget and Start Button */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    Campaign Budget
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="Enter budget amount (e.g., 1000)"
                      className="max-w-xs"
                    />
                    <p className="text-sm text-slate-400 mt-2">
                      Enter the total budget you want to spend on this campaign
                    </p>
                  </div>
                  <Button
                    onClick={handleStartCampaign}
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={!budget.trim()}
                  >
                    Start Campaign <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-16 w-16 text-cyan-400 animate-spin" />
                  <CardTitle className="mb-2">Analyzing Your Campaign Request</CardTitle>
                  <CardDescription>
                    Our AI is finding the perfect target audience and designing your campaign...
                  </CardDescription>
                  <div className="flex gap-2 mt-4">
                    <div className="h-2 w-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!showResults && !loading && (
            <Card className="text-center py-12">
              <CardContent>
                <Search className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                <CardTitle className="mb-2">Start Your Campaign</CardTitle>
                <CardDescription>
                  Enter a description of your target customers and campaign goals above
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

