"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Cpu, TrendingUp, Coins, FileText, Settings, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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
  createdAt: string;
  lastUpdated: string;
  version: string;
  accuracy: number;
  parameters: number;
}

export default function ModelDetailPage() {
  const { account, connected } = useWallet();
  const router = useRouter();
  const params = useParams();
  const modelId = params.id as string;
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
        if (role !== "model_supplier") {
          router.push("/login");
          return;
        }
      } catch (e) {
        console.error("Error checking role:", e);
      }
    }

    // Load model details
    loadModel();
  }, [connected, walletAddress, router, modelId]);

  const loadModel = async () => {
    setLoading(true);
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) || "http://localhost:8000";
      const url = `${API_BASE}/api/models/${modelId}`;
      console.log("Calling API:", url);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setModel(null);
          return;
        }
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const apiModel = await response.json();
      
      // Map API response to Model format
      const mappedModel: Model = {
        id: apiModel.id,
        name: apiModel.name,
        abbreviation: apiModel.abbreviation || "",
        description: apiModel.description,
        category: apiModel.category,
        rank: apiModel.rank,
        usedTimes: apiModel.usedTimes || 0,
        rewardTokens: apiModel.rewardTokens || 0,
        createdAt: apiModel.createdAt,
        lastUpdated: apiModel.updatedAt,
        version: apiModel.version || "1.0.0",
        accuracy: apiModel.accuracy || 0.0,
        parameters: apiModel.parameters || 0,
      };
      
      setModel(mappedModel);
    } catch (error) {
      console.error("Error loading model:", error);
      setModel(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!model) return;

    setShowDeleteDialog(false);
    setDeleting(true);
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) || "http://localhost:8000";
      const url = `${API_BASE}/api/models/${modelId}`;
      
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      toast.success("Model deleted successfully");
      
      // Redirect to models list
      router.push("/model-supplier");
    } catch (error) {
      console.error("Error deleting model:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete model";
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  if (!connected) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading model details...</p>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-slate-400 mb-4">Model not found</p>
            <Link href="/model-supplier">
              <Button variant="outline">Back to Models</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <Link href="/model-supplier">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Models
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2">{model.name}</CardTitle>
                    <div className="mb-2">
                      <span className="text-sm font-semibold text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded">
                        {model.abbreviation}
                      </span>
                    </div>
                    <CardDescription className="text-base">{model.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-lg font-semibold">#{model.rank}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Category</p>
                    <p className="text-lg font-semibold">{model.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Version</p>
                    <p className="text-lg font-semibold">{model.version}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Accuracy</p>
                    <p className="text-lg font-semibold text-green-400">{model.accuracy}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Parameters</p>
                    <p className="text-lg font-semibold">{model.parameters.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Model Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    View Documentation
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Model
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-400/50"
                    onClick={handleDeleteClick}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Model
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Used Times</p>
                  <p className="text-2xl font-bold">{model.usedTimes.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Reward Tokens</p>
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-green-400" />
                    <p className="text-2xl font-bold text-green-400">{model.rewardTokens.toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Created</p>
                  <p className="text-sm font-medium">
                    {new Date(model.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Last Updated</p>
                  <p className="text-sm font-medium">
                    {new Date(model.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-900 border-slate-700" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Model</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete &quot;{model?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="bg-red-500/20 hover:bg-red-500/30 border-red-400/50 text-red-400 hover:text-red-300"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

