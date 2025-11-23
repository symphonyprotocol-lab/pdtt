"use client"

import { ReactNode, useMemo } from "react"
import {
  AptosWalletAdapterProvider,
  AvailableWallets,
  DappConfig,
} from "@aptos-labs/wallet-adapter-react"
import { Network } from "@aptos-labs/ts-sdk"

type AptosWalletProviderProps = {
  children: ReactNode
}

export function AptosWalletProvider({ children }: AptosWalletProviderProps) {
  const wallets: ReadonlyArray<AvailableWallets> = [
    "Petra",
    "Pontem Wallet",
    "Nightly",
    "OKX Wallet",
    "Bitget Wallet",
  ]

  const dappConfig = useMemo(() => {
    const config: DappConfig = {
      network: Network.TESTNET,
    }

    if (process.env.NEXT_PUBLIC_APTOS_CONNECT_DAPP_ID) {
      config.aptosConnectDappId = process.env.NEXT_PUBLIC_APTOS_CONNECT_DAPP_ID
    }

    return config
  }, [])

  const autoConnectEnabled = useMemo(() => {
    if (typeof navigator === "undefined") return false
    const ua = navigator.userAgent || navigator.vendor || ""
    return !/android|iphone|ipad|ipod/i.test(ua)
  }, [])

  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={dappConfig}
      optInWallets={wallets}
    >
      {children}
    </AptosWalletAdapterProvider>
  )
}

