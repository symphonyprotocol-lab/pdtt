"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const WALLET_ROLE_MAP_KEY = "wallet_role_map";

const API_BASE =
  (process.env.NEXT_PUBLIC_BACKEND_URL &&
    process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) ||
  "http://localhost:8000";

const buildApiUrl = (path: string) => `${API_BASE}/api${path}`;

export default function NewModelPage() {
  const { account, connected } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    description: "",
    category: "",
    version: "1.0.0",
    accuracy: "0.0",
    parameters: "0",
  });

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletAddress) {
      toast.error("Please connect your wallet");
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      toast.error("Model name is required");
      return;
    }
    if (!formData.abbreviation.trim()) {
      toast.error("Abbreviation is required");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!formData.category.trim()) {
      toast.error("Category is required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        abbreviation: formData.abbreviation.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        version: formData.version.trim() || "1.0.0",
        accuracy: parseFloat(formData.accuracy) || 0.0,
        parameters: parseInt(formData.parameters) || 0,
      };

      const url = `${buildApiUrl("/models")}?wallet_address=${encodeURIComponent(walletAddress)}`;
      console.log("Creating model:", url, payload);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      toast.success("Model created successfully!");
      
      // Redirect to model detail page
      router.push(`/model-supplier/models/${data.modelId}`);
    } catch (error) {
      console.error("Error creating model:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create model";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Connect Your Wallet</h2>
          <p className="text-slate-400 mb-4">Please connect your wallet to create a new model.</p>
          <Link href="/login">
            <Button variant="web3">Go to Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/model-supplier">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Models
          </Button>
        </Link>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-2xl">Create New Model</CardTitle>
            <CardDescription>
              Add a new AI model to the platform. Fill in the details below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-300">
                  Model Name <span className="text-red-400">*</span>
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Customer Segmentation Model"
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="abbreviation" className="text-sm font-medium text-slate-300">
                  Abbreviation <span className="text-red-400">*</span>
                </label>
                <Input
                  id="abbreviation"
                  name="abbreviation"
                  value={formData.abbreviation}
                  onChange={handleChange}
                  placeholder="e.g., CSM"
                  maxLength={32}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-400">Short 3-word abbreviation for the model</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium text-slate-300">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe what this model does and its use cases..."
                  required
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium text-slate-300">
                  Category <span className="text-red-400">*</span>
                </label>
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="e.g., Customer Analytics, Marketing, Sales"
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="version" className="text-sm font-medium text-slate-300">
                    Version
                  </label>
                  <Input
                    id="version"
                    name="version"
                    value={formData.version}
                    onChange={handleChange}
                    placeholder="1.0.0"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="accuracy" className="text-sm font-medium text-slate-300">
                    Accuracy (%)
                  </label>
                  <Input
                    id="accuracy"
                    name="accuracy"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.accuracy}
                    onChange={handleChange}
                    placeholder="0.0"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="parameters" className="text-sm font-medium text-slate-300">
                    Parameters
                  </label>
                  <Input
                    id="parameters"
                    name="parameters"
                    type="number"
                    min="0"
                    value={formData.parameters}
                    onChange={handleChange}
                    placeholder="0"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 gap-2"
                  variant="web3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create Model
                    </>
                  )}
                </Button>
                <Link href="/model-supplier" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

