"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@/components/wallet-selector";
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
import { Building2, LogOut, ArrowRight, Users, Coins, CheckCircle, Clock, XCircle, Trash2, Image as ImageIcon, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { CouponVoucher } from "@/components/coupon-voucher";
import { MerkleTree } from "merkletreejs";
import { sha3_256 } from "js-sha3";
import { Buffer } from "buffer";

const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS || "0x100";
// Calculate token metadata address: sha3_256(creator_address + "SYM" + 0xFE)
// For 0x100, we can calculate it dynamically or use a fixed value if creator is fixed.
// Here we'll calculate it dynamically assuming creator is MODULE_ADDRESS.

const WALLET_ROLE_MAP_KEY = "wallet_role_map";

type JobStatus = "pending" | "running" | "completed" | "failed" | "stopped";

interface Job {
  id: string;
  name: string;
  description: string;
  targetGroup: string;
  budget: number;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  stoppedAt?: string;
  userCount: number;
  couponSent: number;
  couponUsed: number;
  couponDesign?: {
    description: string;
    imageUrl?: string;
    tokenAmount?: number;
  };
  targetStore?: string | null;
  targetItem?: string | null;
}

export default function JobsPage() {
  const { account, connected, disconnect, signAndSubmitTransaction } = useWallet();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [expandedCouponJobId, setExpandedCouponJobId] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const loadJobs = useCallback(async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setBackendError(null);

    try {
      const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) || "http://localhost:8000";
      const url = `${API_BASE}/api/campaigns/${walletAddress}`;
      console.log("Calling API:", url);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      let response: Response;
      try {
        response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        // Handle network errors (CORS, connection refused, timeout, etc.)
        console.error("Fetch error:", fetchError);

        const error = fetchError as { name?: string; message?: string };
        let errorMsg = "";
        if (error.name === "AbortError") {
          errorMsg = `Request timeout. Backend server at ${API_BASE} is not responding.`;
        } else if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
          errorMsg = `Cannot connect to backend server at ${API_BASE}. Please ensure the backend is running.`;
        } else {
          errorMsg = `Network error: ${error.message || "Unknown error"}`;
        }

        setBackendError(errorMsg);
        throw new Error(errorMsg);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        // Check if it's an HTML error page (404 from Next.js)
        if (errorText.includes("<!DOCTYPE html>") || errorText.includes("404")) {
          const errorMsg = `Backend server not found at ${API_BASE}. Please ensure the backend is running.`;
          setBackendError(errorMsg);
          throw new Error(errorMsg);
        }
        const errorMsg = errorText || `HTTP error! status: ${response.status}`;
        setBackendError(errorMsg);
        throw new Error(errorMsg);
      }

      const data = await response.json();

      // Map API response to Job format
      const mappedJobs: Job[] = (data.campaigns || []).map((campaign: {
        id: string;
        query: string;
        targetGroup: string;
        budget: number;
        status: string;
        createdAt: string;
        startedAt?: string;
        completedAt?: string;
        stoppedAt?: string;
        userCount?: number;
        couponSent?: number;
        couponUsed?: number;
        couponDesign?: {
          description: string;
          imageUrl?: string;
        };
        targetStore?: string;
        targetItem?: string;
      }) => ({
        id: campaign.id,
        name: campaign.query.substring(0, 50) + (campaign.query.length > 50 ? "..." : ""),
        description: campaign.query,
        targetGroup: campaign.targetGroup,
        budget: campaign.budget,
        status: campaign.status as JobStatus,
        createdAt: campaign.createdAt,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
        stoppedAt: campaign.stoppedAt,
        userCount: campaign.userCount || 0,
        couponSent: campaign.couponSent || 0,
        couponUsed: campaign.couponUsed || 0,
        couponDesign: campaign.couponDesign,
        targetStore: campaign.targetStore,
        targetItem: campaign.targetItem,
      }));

      setJobs(mappedJobs);
      setBackendError(null); // Clear error on success
    } catch (error) {
      console.error("Error loading jobs:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load campaigns";

      // Only show toast if we don't have a backend error (to avoid duplicate messages)
      if (!backendError) {
        toast.error(errorMessage, {
          duration: 5000,
        });
      }

      // Set empty jobs on error to prevent UI issues
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!connected) {
      router.push("/login");
      return;
    }

    // Load jobs when wallet address is available
    if (walletAddress) {
      loadJobs();
    }
  }, [connected, walletAddress, router, loadJobs]);

  const handleLogout = () => {
    disconnect();
    router.push("/login");
  };

  const handleCampaignAction = async (jobId: string, action: "start" | "stop") => {
    if (action === "start") {
      if (!walletAddress) {
        toast.error("Please connect your wallet to start the campaign");
        return;
      }

      try {
        const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) || "http://localhost:8000";

        // 1. Fetch campaign details to get target wallet addresses
        const campaignResponse = await fetch(`${API_BASE}/api/campaigns/detail/${jobId}`);
        console.log("Campaign response:", campaignResponse);
        let targetAddresses: string[] = [];
        let budget = 0;

        if (campaignResponse.ok) {
          const campaignData = await campaignResponse.json();
          console.log("Campaign data:", campaignData);
          targetAddresses = campaignData.targetWalletAddresses || [];
          budget = campaignData.budget || 0;
        } else {
          // Fallback: try to find in current jobs list if detail API fails
          const job = jobs.find(j => j.id === jobId);
          if (job) {
            budget = job.budget;
          }
          if (targetAddresses.length === 0) {
            console.warn("Could not fetch target addresses, using empty list");
          }
        }

        if (targetAddresses.length === 0) {
          toast.error("No target addresses found for this campaign. Cannot generate Merkle Tree.");
          return;
        }

        // 2. Generate Merkle Tree
        const leaves = targetAddresses.map((addr: string) => {
          // Remove 0x prefix if present
          const cleanAddr = addr.startsWith("0x") ? addr.slice(2) : addr;
          // Convert to bytes
          const addrBytes = Buffer.from(cleanAddr, "hex");
          // Hash using SHA3-256
          return Buffer.from(sha3_256(addrBytes), "hex");
        });

        const tree = new MerkleTree(leaves, (data: Buffer) => Buffer.from(sha3_256(data), "hex"), { sortPairs: true });
        const root = tree.getRoot(); // Buffer
        const rootHash = Array.from(root); // Convert to number[] for Move vector<u8>

        // 3. Submit Transaction
        // Calculate token metadata address
        // creator (MODULE_ADDRESS) + "SYM" + 0xFE
        const creatorAddr = MODULE_ADDRESS.startsWith("0x") ? MODULE_ADDRESS.slice(2) : MODULE_ADDRESS;
        const seed = "SYM";
        const seedBytes = Buffer.from(seed, "utf-8");
        const creatorBytes = Buffer.from(creatorAddr, "hex");

        const buffer = Buffer.concat([
          creatorBytes,
          seedBytes,
          Buffer.from([0xFE])
        ]);
        const metadataAddrBytes = Buffer.from(sha3_256(buffer), "hex");
        const metadataAddr = "0x" + metadataAddrBytes.toString("hex");

        // Calculate total amount (100% of budget)
        const totalAmount = Math.floor(budget * 100000000); // Assuming 8 decimals

        const transaction = {
          data: {
            function: `${MODULE_ADDRESS}::ad_rewards::create_ad`,
            functionArguments: [
              Array.from(Buffer.from(jobId)), // ad_id: vector<u8>
              metadataAddr, // token_metadata: Object<Metadata>
              totalAmount, // total_amount
              rootHash, // merkle_root: vector<u8>
              targetAddresses.length // user_count: u64
            ],
          },
        };

        console.log("Submitting transaction with params:", {
          ad_id: jobId,
          metadata: metadataAddr,
          amount: totalAmount,
          root: Buffer.from(rootHash).toString('hex'),
          count: targetAddresses.length
        });

        const response = await signAndSubmitTransaction(transaction as any);
        toast.success("Transaction submitted! Waiting for confirmation...");

        // 4. Update Backend
        const actionUrl = `${API_BASE}/api/campaigns/${jobId}/action`;
        await fetch(actionUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", txHash: response.hash }),
        });

        toast.success("Campaign started successfully!");
        loadJobs();

      } catch (error) {
        console.error("Error starting campaign:", error);
        toast.error("Failed to start campaign: " + (error instanceof Error ? error.message : String(error)));
      }
    } else {
      // Stop action
      try {
        const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) || "http://localhost:8000";
        const url = `${API_BASE}/api/campaigns/${jobId}/action`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }

        await response.json();
        toast.success(`Campaign stopped successfully!`);

        // Reload jobs to get updated status
        loadJobs();
      } catch (error) {
        console.error(`Error stopping campaign:`, error);
        const errorMessage = error instanceof Error ? error.message : `Failed to stop campaign`;
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteCampaign = (jobId: string, jobName: string) => {
    setCampaignToDelete({ id: jobId, name: jobName });
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return;

    setDeleting(true);
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) || "http://localhost:8000";
      const url = `${API_BASE}/api/campaigns/${campaignToDelete.id}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorData = JSON.parse(errorText).detail || errorText;
        throw new Error(errorData || `HTTP error! status: ${response.status}`);
      }

      toast.success("Campaign deleted successfully!");
      setShowDeleteDialog(false);
      setCampaignToDelete(null);

      // Reload jobs to get updated list
      loadJobs();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete campaign";
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "running":
        return <Clock className="h-5 w-5 text-blue-400 animate-pulse" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-400" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-400" />;
    }
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case "completed":
        return "border-green-400/50 bg-green-400/10";
      case "running":
        return "border-blue-400/50 bg-blue-400/10";
      case "pending":
        return "border-yellow-400/50 bg-yellow-400/10";
      case "failed":
        return "border-red-400/50 bg-red-400/10";
      case "stopped":
        return "border-gray-400/50 bg-gray-400/10";
    }
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
                Campaign Jobs
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/company-user">
                <Button variant="outline">New Campaign</Button>
              </Link>
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
        {backendError && (
          <Card className="mb-6 border-red-400/50 bg-red-400/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-400 mb-2">Backend Connection Error</h3>
                  <p className="text-sm text-slate-300 mb-3">{backendError}</p>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>To fix this issue:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Ensure the backend server is running</li>
                      <li>Check that CORS is configured correctly</li>
                      <li>Verify NEXT_PUBLIC_BACKEND_URL is set correctly</li>
                    </ul>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => loadJobs()}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 && !backendError ? (
          <Card className="p-12 text-center">
            <CardContent>
              <Building2 className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <CardTitle className="mb-2">No jobs yet</CardTitle>
              <CardDescription className="mb-6">
                Create your first campaign to get started
              </CardDescription>
              <Link href="/company-user">
                <Button size="lg">Create Campaign</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className={`transition-all hover:border-cyan-400/50 ${getStatusColor(job.status)}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}>
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(job.status)}
                        <CardTitle className="text-xl">{job.name}</CardTitle>
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-slate-700/50 text-slate-300 uppercase">
                          {job.status}
                        </span>
                      </div>
                      <CardDescription>{job.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Start/Stop buttons */}
                      {job.status === "pending" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCampaignAction(job.id, "start");
                          }}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          Start
                        </Button>
                      )}
                      {job.status === "running" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCampaignAction(job.id, "stop");
                          }}
                        >
                          Stop
                        </Button>
                      )}
                      {job.status === "stopped" && (
                        <span className="text-xs text-slate-500 px-2 py-1">Cannot restart</span>
                      )}
                      {/* Delete button - only show if no coupons have been sent */}
                      {job.couponSent === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCampaign(job.id, job.name);
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}>
                        <ArrowRight className={`h-4 w-4 transition-transform ${selectedJob?.id === job.id ? "rotate-90" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {selectedJob?.id === job.id && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-700">
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Target Group</p>
                        <p className="text-base font-medium">{job.targetGroup}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Budget</p>
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-green-400" />
                          <p className="text-base font-medium">${job.budget.toLocaleString()}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Users Targeted</p>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-blue-400" />
                          <p className="text-base font-medium">{job.userCount.toLocaleString()}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Coupons Sent</p>
                        <p className="text-base font-medium">{job.couponSent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Coupons Used</p>
                        <p className="text-base font-medium text-purple-400">{job.couponUsed.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-700">
                      <div>
                        <p className="text-sm text-slate-400 mb-1">Created</p>
                        <p className="text-sm font-medium">
                          {new Date(job.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {job.startedAt && (
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Started</p>
                          <p className="text-sm font-medium">
                            {new Date(job.startedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {job.completedAt && (
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Completed</p>
                          <p className="text-sm font-medium">
                            {new Date(job.completedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {job.stoppedAt && (
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Stopped</p>
                          <p className="text-sm font-medium">
                            {new Date(job.stoppedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {job.status === "running" && (
                      <div className="pt-4 border-t border-slate-700">
                        <div className="flex items-center gap-2 text-blue-400">
                          <Clock className="h-4 w-4 animate-pulse" />
                          <p className="text-sm font-medium">Campaign is currently running...</p>
                        </div>
                      </div>
                    )}
                    {job.couponDesign && (
                      <div className="pt-4 border-t border-slate-700">
                        <button
                          onClick={() => setExpandedCouponJobId(expandedCouponJobId === job.id ? null : job.id)}
                          className="w-full flex items-center justify-between p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-cyan-400" />
                            <span className="text-sm font-medium">Coupon Voucher</span>
                          </div>
                          {expandedCouponJobId === job.id ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                        {expandedCouponJobId === job.id && (
                          <div className="mt-4 max-w-2xl rounded-lg overflow-hidden">
                            <CouponVoucher couponDesign={{
                              ...job.couponDesign,
                              targetStore: job.targetStore,
                              targetItem: job.targetItem
                            }} />
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-900 border-slate-700" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Campaign</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete &quot;{campaignToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setCampaignToDelete(null);
              }}
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

