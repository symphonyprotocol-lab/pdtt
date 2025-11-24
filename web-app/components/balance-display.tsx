"use client"

import { useEffect, useState } from "react"
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk"
import { sha3_256 } from "js-sha3"
import { Loader2, Coins, Wallet } from "lucide-react"

const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS || "0x123"

interface BalanceDisplayProps {
    walletAddress: string | null
}

export function BalanceDisplay({ walletAddress }: BalanceDisplayProps) {
    const [aptBalance, setAptBalance] = useState<string | null>(null)
    const [symBalance, setSymBalance] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!walletAddress) {
            setAptBalance(null)
            setSymBalance(null)
            return
        }

        const fetchBalances = async () => {
            setLoading(true)
            try {
                const config = new AptosConfig({ network: Network.TESTNET })
                const aptos = new Aptos(config)

                // 1. Fetch APT Balance
                try {
                    const resources = await aptos.getAccountCoinAmount({
                        accountAddress: walletAddress,
                        coinType: "0x1::aptos_coin::AptosCoin",
                    })
                    // Convert to APT (8 decimals)
                    const apt = (Number(resources) / 100_000_000).toFixed(2)
                    setAptBalance(apt)
                } catch (e) {
                    console.error("Error fetching APT balance:", e)
                    setAptBalance("0.00")
                }

                // 2. Fetch SYM Balance (Fungible Asset)
                try {
                    // Calculate Metadata Address
                    // creator (MODULE_ADDRESS) + "SYM" + 0xFE
                    const creatorAddr = MODULE_ADDRESS.startsWith("0x") ? MODULE_ADDRESS.slice(2) : MODULE_ADDRESS
                    const seed = "SYM"

                    // Create buffer for hashing
                    // We need to match the Move logic: sha3_256(creator_addr + seed + 0xFE)
                    const creatorBytes = new Uint8Array(Buffer.from(creatorAddr, "hex"))
                    const seedBytes = new TextEncoder().encode(seed)
                    const typeByte = new Uint8Array([0xFE])

                    const combined = new Uint8Array(creatorBytes.length + seedBytes.length + typeByte.length)
                    combined.set(creatorBytes)
                    combined.set(seedBytes, creatorBytes.length)
                    combined.set(typeByte, creatorBytes.length + seedBytes.length)

                    const metadataHash = sha3_256(combined)
                    const metadataAddr = "0x" + metadataHash

                    // Fetch FA Balance using View Function
                    const result = await aptos.view({
                        payload: {
                            function: "0x1::primary_fungible_store::balance",
                            typeArguments: [], // Metadata object type
                            functionArguments: [walletAddress, metadataAddr],
                        },
                    })

                    if (result && result.length > 0) {
                        // Convert to SYM (8 decimals)
                        const sym = (Number(result[0]) / 100_000_000).toFixed(2)
                        setSymBalance(sym)
                    } else {
                        setSymBalance("0.00")
                    }
                } catch (e) {
                    console.error("Error fetching SYM balance:", e)
                    // Try fetching via getAccountResource if view fails (fallback)
                    setSymBalance("0.00")
                }

            } catch (error) {
                console.error("Error fetching balances:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchBalances()

        // Refresh every 15 seconds
        const interval = setInterval(fetchBalances, 15000)
        return () => clearInterval(interval)
    }, [walletAddress])

    if (!walletAddress) return null

    return (
        <div className="flex items-center gap-4 mr-4">
            {/* APT Balance */}
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
                <div className="bg-slate-700 p-1 rounded-full">
                    <Wallet className="w-3 h-3 text-slate-300" />
                </div>
                <span className="text-sm font-medium text-slate-200">
                    {loading && !aptBalance ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        `${aptBalance || "0.00"} APT`
                    )}
                </span>
            </div>

            {/* SYM Balance */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-1 rounded-full shadow-sm">
                    <Coins className="w-3 h-3 text-slate-900" />
                </div>
                <span className="text-sm font-bold text-yellow-400">
                    {loading && !symBalance ? (
                        <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />
                    ) : (
                        `${symBalance || "0.00"} SYM`
                    )}
                </span>
            </div>
        </div>
    )
}
