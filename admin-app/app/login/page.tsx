"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@/components/wallet-selector";
import { RoleSelector, UserRole } from "@/components/role-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Cpu, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_STORAGE_KEY = "admin_user_role";
const WALLET_ROLE_MAP_KEY = "wallet_role_map";

export default function LoginPage() {
  const { account, connected } = useWallet();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

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
    if (connected && walletAddress) {
      // Check if user has a stored role for this wallet
      const walletRoleMap = localStorage.getItem(WALLET_ROLE_MAP_KEY);
      if (walletRoleMap) {
        try {
          const map = JSON.parse(walletRoleMap);
          const storedRole = map[walletAddress] as UserRole;
          if (storedRole) {
            setSelectedRole(storedRole);
            // Auto-navigate if role is set
            navigateToRole(storedRole);
            return;
          }
        } catch (e) {
          console.error("Error parsing wallet role map:", e);
        }
      }
      // Check legacy storage
      const legacyRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
      if (legacyRole && (legacyRole === "model_supplier" || legacyRole === "company_user")) {
        setSelectedRole(legacyRole);
        navigateToRole(legacyRole);
        return;
      }
      // First time login - show role selector
      setShowRoleSelector(true);
    } else {
      setShowRoleSelector(false);
      setSelectedRole(null);
    }
  }, [connected, walletAddress]);

  const navigateToRole = (role: UserRole) => {
    if (role === "model_supplier") {
      router.push("/model-supplier");
    } else if (role === "company_user") {
      router.push("/company-user");
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    if (!walletAddress) return;
    
    setSelectedRole(role);
    
    // Store role mapping for this wallet
    const walletRoleMap = localStorage.getItem(WALLET_ROLE_MAP_KEY);
    let map: Record<string, UserRole> = {};
    if (walletRoleMap) {
      try {
        map = JSON.parse(walletRoleMap);
      } catch (e) {
        console.error("Error parsing wallet role map:", e);
      }
    }
    map[walletAddress] = role;
    localStorage.setItem(WALLET_ROLE_MAP_KEY, JSON.stringify(map));
    
    // Also store legacy key for backward compatibility
    localStorage.setItem(ROLE_STORAGE_KEY, role || "");
    
    navigateToRole(role);
  };

  const handleSwitchRole = () => {
    setShowRoleSelector(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Admin Portal
          </CardTitle>
          <CardDescription className="text-lg">
            Connect your wallet to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!connected ? (
            <div className="flex flex-col items-center gap-4">
              <WalletSelector />
            </div>
          ) : showRoleSelector ? (
            <RoleSelector
              onRoleSelect={handleRoleSelect}
              currentRole={selectedRole}
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Welcome back! You are logged in as{" "}
                  <span className="font-semibold text-foreground">
                    {selectedRole === "model_supplier" ? "Model Supplier" : "Company User"}
                  </span>
                </p>
              </div>
              <div className="flex gap-4 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSwitchRole}
                >
                  Switch Role
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => navigateToRole(selectedRole)}
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

