"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  useWallet,
  WalletReadyState,
} from "@aptos-labs/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown, Loader2, LogOut, Settings } from "lucide-react"
import { Island_Moments } from "next/font/google"

export function WalletConnect() {
  const {
    account,
    connect,
    connected,
    disconnect,
    wallets,
    notDetectedWallets,
    isLoading,
  } = useWallet()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [walletListOpen, setWalletListOpen] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const removeAutoConnectPreference = () => {
    if (typeof window === "undefined") return
    localStorage.removeItem("AptosWalletName")
  }

  const noWalletMessage = "No compatible wallets detected. Install a supported wallet extension."

  const attemptWalletFallbackDisconnect = async () => {
    if (typeof window === "undefined") return false
    const candidates = [
      (window as typeof window & { aptos?: unknown }).aptos,
      (window as typeof window & { petra?: unknown }).petra,
    ].filter(Boolean) as Array<{ disconnect?: () => Promise<void> }>
    for (const wallet of candidates) {
      try {
        if (wallet?.disconnect) {
          await wallet.disconnect()
          return true
        }
      } catch (error) {
        console.error("Fallback wallet disconnect failed", error)
      }
    }
    return false
  }


  const installedWallets = useMemo(
    () =>
      wallets.filter(
        (wallet) => wallet.readyState === WalletReadyState.Installed,
      ),
    [wallets],
  )

  const walletOptions = useMemo(() => {

    if (installedWallets.length) return installedWallets
    if (wallets.length) return wallets
    return notDetectedWallets
  }, [installedWallets, notDetectedWallets, wallets])


  const accountAddress = useMemo(() => {
    const addr = account?.address as unknown
    if (!addr) return undefined
    if (typeof addr === "string") return addr
    if (typeof addr === "object" && "toString" in addr) {
      const value = (addr as { toString: () => string }).toString()
      return typeof value === "string" ? value : undefined
    }
    return undefined
  }, [account?.address])

  const accountLabel =
    connected && accountAddress
      ? `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`
      : "Connect Wallet"


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false)
        setWalletListOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handlePrimaryClick = () => {
    if (isLoading || isDisconnecting) return
    setConnectError(null)

    if (connected) {
      setAccountMenuOpen((prev) => !prev)
    } else {
      setWalletListOpen((prev) => !prev)
    }
  }

  const handleSelectWallet = async (walletName: string) => {
    try {
      setConnectError(null)
      await connect(walletName)
      setWalletListOpen(false)
    } catch (error) {
      console.error("Wallet connection failed", error)
      setConnectError(
        error instanceof Error ? error.message : "Unable to connect wallet",
      )
    }
  }

  const handleDisconnect = async () => {
    try {
      console.log("handleDisconnect")
      console.log(wallets)
      setIsDisconnecting(true)
      removeAutoConnectPreference()
      console.log("disconnecting")
      await disconnect()
      console.log("disconnected")
    } catch (error) {
      console.error("Failed to disconnect wallet", error)
      const fallbackDisconnected = await attemptWalletFallbackDisconnect()
      if (!fallbackDisconnected) {
        console.error("No fallback wallet disconnect handler available")
      } else {
        removeAutoConnectPreference()
      }
    } finally {
      setIsDisconnecting(false)
      setAccountMenuOpen(false)
      setWalletListOpen(false)
    }
  }

  const handleSettings = () => {
    setAccountMenuOpen(false)
    console.info("Wallet settings clicked")
  }

  const dropdownVisible = connected ? accountMenuOpen : walletListOpen
  const primaryBusy = isDisconnecting

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="web3"
        onClick={handlePrimaryClick}
        disabled={primaryBusy}
        className={cn(
          "min-w-[180px] justify-between px-4 py-2 text-sm font-semibold",
          !connected && "text-white",
        )}
      >
        <span>{accountLabel}</span>
        {isLoading ? (<span>isLoading</span>):(<span>notLoading</span>)}
        {primaryBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              dropdownVisible && "rotate-180",
            )}
          />
        )}
      </Button>

      {!connected && walletListOpen && (
        <div className="absolute right-0 mt-3 w-64 rounded-xl border border-cyan-500/30 bg-slate-900/95 p-2 text-sm text-slate-50 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl z-50">
          {connectError && (
            <p className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {connectError}
            </p>
          )}
          {walletOptions.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-400">
              {noWalletMessage}
            </div>
          ) : (
            <>
              {walletOptions.map((wallet) => (
              <button
                key={wallet.name}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-800/70"
                onClick={() => handleSelectWallet(wallet.name)}
              >
                <div className="space-y-0.5">
                  <p className="font-semibold">{wallet.name}</p>
                  <p className="text-xs text-slate-400">
                    {wallet.readyState === WalletReadyState.Installed
                      ? "Installed"
                      : "Not detected"}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 -rotate-90 opacity-70" />
              </button>
              ))}
            </>
          )}
        </div>
      )}

      {connected && accountMenuOpen && (
        <div className="absolute right-0 mt-3 w-48 rounded-xl border border-cyan-500/30 bg-slate-900/95 p-2 text-sm text-slate-50 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl z-50">
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-800/70"
            onClick={handleSettings}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-400 hover:bg-red-500/10"
            onClick={handleDisconnect}
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}

