"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@/components/wallet-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Cpu, TrendingUp, Coins, ArrowRight, LogOut } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const WALLET_ROLE_MAP_KEY = "wallet_role_map";

interface Model {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  category: string;
  rank: number;
  usedTimes: number;
  rewardTokens: number;
}

export default function ModelSupplierPage() {
  const { account, connected, disconnect } = useWallet();
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

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

  const loadModels = useCallback(async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) || "http://localhost:8000";
      const url = `${API_BASE}/api/models?wallet_address=${encodeURIComponent(walletAddress)}`;
      console.log("Calling API:", url);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Map API response to Model format
      const mappedModels: Model[] = (data.models || []).map((model: {
        id: string;
        name: string;
        abbreviation: string;
        description: string;
        category: string;
        rank: number;
        usedTimes: number;
        rewardTokens: number;
      }) => ({
        id: model.id,
        name: model.name,
        abbreviation: model.abbreviation || "",
        description: model.description,
        category: model.category,
        rank: model.rank,
        usedTimes: model.usedTimes || 0,
        rewardTokens: model.rewardTokens || 0,
      }));
      
      setModels(mappedModels);
    } catch (error) {
      console.error("Error loading models:", error);
      toast.error("Failed to load models");
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

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
        if (role !== "model_supplier") {
          router.push("/login");
          return;
        }
      } catch (e) {
        console.error("Error checking role:", e);
      }
    }

    // Load models when wallet address is available
    if (walletAddress) {
      loadModels();
    }
  }, [connected, walletAddress, router, loadModels]);

  const handleLogout = () => {
    disconnect();
    router.push("/login");
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
    map[walletAddress] = "company_user";
    localStorage.setItem(WALLET_ROLE_MAP_KEY, JSON.stringify(map));
    router.push("/company-user");
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
              <Cpu className="h-6 w-6 text-cyan-400" />
              <h1 className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
                Model Supplier Portal
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleSwitchRole}>
                Switch to Company User
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">My Models</h2>
            <p className="text-slate-400">Manage your AI models and track their performance</p>
          </div>
          <Link href="/model-supplier/models/new">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              New Model
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading models...</p>
          </div>
        ) : models.length === 0 ? (
          <Card className="p-12 text-center">
            <CardContent>
              <Cpu className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <CardTitle className="mb-2">No models yet</CardTitle>
              <CardDescription className="mb-6">
                Get started by uploading your first AI model
              </CardDescription>
              <Link href="/model-supplier/models/new">
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Upload Model
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model) => (
              <Link key={model.id} href={`/model-supplier/models/${model.id}`}>
                <Card className="hover:border-cyan-400/50 transition-all cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{model.name}</CardTitle>
                        <div className="mt-1">
                          <span className="text-xs font-semibold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">
                            {model.abbreviation}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-400">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-semibold">#{model.rank}</span>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {model.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Category:</span>
                        <span className="text-white font-medium">{model.category}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Used Times:</span>
                        <span className="text-white font-medium">{model.usedTimes.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Reward Tokens:</span>
                        <div className="flex items-center gap-1 text-green-400">
                          <Coins className="h-4 w-4" />
                          <span className="font-semibold">{model.rewardTokens.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="pt-2 flex items-center text-cyan-400 text-sm font-medium">
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

