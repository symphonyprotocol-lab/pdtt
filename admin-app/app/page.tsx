"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

export default function Home() {
  const router = useRouter();
  const { connected } = useWallet();

  useEffect(() => {
    if (connected) {
      // Redirect to login page which will handle role selection
      router.push("/login");
    } else {
      router.push("/login");
    }
  }, [connected, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
