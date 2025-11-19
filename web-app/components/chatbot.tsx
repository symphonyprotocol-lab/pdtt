"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Image as ImageIcon, X, Loader2 } from "lucide-react"
import Image from "next/image"
import { WalletSelector } from "@/components/wallet-selector"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { ReceiptViewer } from "@/components/receipt-viewer"
import Link from "next/link"

const API_BASE =
  (process.env.NEXT_PUBLIC_BACKEND_URL &&
    process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")) ||
  ""
const buildApiUrl = (path: string) => `${API_BASE}/api${path}`

interface Message {
  id: string
  role: "user" | "assistant"
  originalRole?: string // Preserve original role to detect command_reply
  content: string
  imageUrl?: string
  timestamp: Date
}

interface ApiChatMessage {
  id: string
  role: string
  content: string
  attachmentUrl?: string | null
  createdAt: string
}

interface ApiChatResponse {
  walletAddress: string
  messages: ApiChatMessage[]
}

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [inputFocused, setInputFocused] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [conversationLoading, setConversationLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { account, connected } = useWallet()

  const walletAddress = useMemo(() => {
    const addr = account?.address as unknown
    if (!addr) return null
    if (typeof addr === "string") return addr
    if (typeof addr === "object" && "toString" in addr) {
      const value = (addr as { toString: () => string }).toString()
      return typeof value === "string" ? value : null
    }
    return null
  }, [account?.address])

  const canChat = connected && !!walletAddress

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const imageUrl = await response.json()
      console.log("Uploaded image URL:", imageUrl)
      setSelectedImage(imageUrl)

      // Automatically send SendReceipt command
      if (canChat && walletAddress) {
        setIsLoading(true)
        setChatError(null)
        try {
          const commandResponse = await fetch(buildApiUrl("/chat"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              walletAddress,
              message: "/SendReceipt",
              attachmentUrl: imageUrl,
            }),
          })

          if (!commandResponse.ok) {
            throw new Error("Failed to process receipt")
          }

          const data: ApiChatResponse = await commandResponse.json()
          setMessages(mapApiMessages(data.messages ?? []))
          setSelectedImage(null) // Clear selected image after sending
        } catch (error) {
          console.error("Error sending receipt command:", error)
          setChatError("Failed to process receipt. Please try again.")
        } finally {
          setIsLoading(false)
        }
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image"
      alert(errorMessage)
    } finally {
      setUploadingImage(false)
    }
  }

  const mapApiMessages = useCallback((apiMessages: ApiChatMessage[]): Message[] => {
    return apiMessages.map((msg) => ({
      id: msg.id,
      role: msg.role === "command_reply" ? "assistant" : msg.role === "command" ? "user" : msg.role === "assistant" ? "assistant" : "user",
      originalRole: msg.role, // Preserve original role
      content: msg.content,
      imageUrl: msg.attachmentUrl || undefined,
      timestamp: new Date(msg.createdAt),
    }))
  }, [])

  const fetchConversation = useCallback(async () => {
    if (!walletAddress) {
      setMessages([])
      return
    }
    setConversationLoading(true)
    setChatError(null)
    try {
      const response = await fetch(
        buildApiUrl(`/conversations/${walletAddress}`),
      )
      if (response.status === 404) {
        setMessages([])
        return
      }
      if (!response.ok) {
        const errText = await response.text().catch(() => "")
        throw new Error(errText || "Failed to load conversation")
      }
      const data: ApiChatResponse = await response.json()
      setMessages(mapApiMessages(data.messages ?? []))
    } catch (error) {
      console.error("Error loading conversation:", error)
      setChatError("Unable to load conversation. Please try again.")
    } finally {
      setConversationLoading(false)
    }
  }, [walletAddress, mapApiMessages])

  useEffect(() => {
    if (canChat) {
      fetchConversation()
    } else {
      setMessages([])
    }
  }, [canChat, fetchConversation])

  const handleSend = async () => {
    if (!walletAddress || !canChat) {
      setChatError("Connect your wallet to chat with Persdato.")
      return
    }
    if (!input.trim() && !selectedImage) return

    const messagePayload = input.trim()

    setIsLoading(true)
    setChatError(null)

    try {
      const response = await fetch(buildApiUrl("/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          message: messagePayload,
          attachmentUrl: selectedImage ?? undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const data: ApiChatResponse = await response.json()
      setMessages(mapApiMessages(data.messages ?? []))
      setInput("")
      setSelectedImage(null)
    } catch (error) {
      console.error("Error sending message:", error)
      setChatError("Unable to reach the AI right now. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!canChat) return
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearMessages = async () => {
    if (!canChat || !walletAddress) {
      setMessages([])
      setSelectedImage(null)
      setChatError(null)
      return
    }

    setSelectedImage(null)
    setChatError(null)
    setIsLoading(true)

    try {
      const response = await fetch(
        buildApiUrl(`/conversations/${walletAddress}`),
        {
          method: "DELETE",
        },
      )

      if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        throw new Error(errorText || "Failed to delete conversation")
      }

      // Clear local state
      setMessages([])
      setSelectedImage(null)
      setChatError(null)
    } catch (error) {
      console.error("Error deleting conversation:", error)
      const errorMessage = error instanceof Error ? error.message : "Unable to delete conversation. Please try again later."
      setChatError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const inputPlaceholder = canChat
    ? "Type your message..."
    : "Connect your wallet to chat"

  return (
    <div className="flex h-screen w-full flex-col bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      {/* Header with web3 styling */}
      <div className="relative border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm z-20">
        <div className="container mx-auto px-004 py-4 max-w-4xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
              <h1 className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-xl font-bold text-transparent">
                Persdato
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <WalletSelector />
              {canChat && messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearMessages}
                  disabled={isLoading}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
                  title="Delete conversation"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="relative z-10 flex-1">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          {!canChat && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <h2 className="mb-2 text-2xl font-bold text-slate-100">
                Connect your wallet to chat
              </h2>
              <p>Link your wallet to start a conversation with Persdato.</p>
            </div>
          )}

          {canChat && messages.length === 0 && !conversationLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 p-6" style={{ animation: 'breath 3s ease-in-out infinite' }}>
                <div className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400" style={{ animation: 'breath 2.5s ease-in-out infinite' }} />
              </div>
              <h2 className="mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
                Welcome to Persdato
              </h2>
              <p className="text-slate-400">
                Your personal data is your property. You can tokenize it and trade it with others.
              </p>
            </div>
          )}

          {conversationLoading && canChat && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            </div>
          )}

          {messages.map((message) => {
            // Check if this is a command_reply with receipt data
            const isReceiptMessage =
              message.originalRole === "command_reply" &&
              (message.content.startsWith("{") || message.content.startsWith('{"command"'))
            
            let receiptData = null
            let receiptImageUrl = message.imageUrl

            if (isReceiptMessage) {
              try {
                const parsed = JSON.parse(message.content)
                if (parsed.command === "SendReceipt" && parsed.content) {
                  receiptData = parsed.content
                  // Get image URL from receipt meta if available
                  if (receiptData.meta?.source_image) {
                    receiptImageUrl = receiptData.meta.source_image
                  }
                }
              } catch {
                // Not valid JSON, fall through to normal rendering
              }
            }

            // Render receipt component if it's a receipt message
            if (receiptData) {
              return (
                <div
                  key={message.id}
                  className="flex justify-start mt-4"
                >
                  <ReceiptViewer receiptData={receiptData} imageUrl={receiptImageUrl} />
                </div>
              )
            }

            // Normal message rendering
            return (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <Card
                  className={`max-w-[80%] mt-4 ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-400/30"
                      : "bg-slate-800/50 border-slate-700/50"
                  } backdrop-blur-sm`}
                >
                  <div className="p-4">
                    {message.imageUrl && (
                      <div className="mb-3 overflow-hidden rounded-lg">
                        <Image
                          src={message.imageUrl}
                          alt="Uploaded"
                          width={400}
                          height={300}
                          className="h-auto w-full object-cover"
                        />
                      </div>
                    )}
                    <p className="text-slate-100 whitespace-pre-wrap">{message.content}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </Card>
              </div>
            )
          })}
          <div ref={messagesEndRef} />

          {isLoading && (
            <div className="flex justify-start mt-4">
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  <span className="text-slate-400">Thinking...</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Image preview */}
      {selectedImage && (
        <div className="border-t border-cyan-500/20 bg-slate-900/80 ">
          <div className="container mx-auto max-w-4xl px-4 py-2">
            <div className="relative inline-block">
              <Image
                src={selectedImage}
                alt="Preview"
                width={100}
                height={100}
                className="h-20 w-20 rounded-lg object-cover"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 hover:bg-red-600"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="relative border-t border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm z-10">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          {chatError && (
            <p className="pb-2 text-sm text-red-400">{chatError}</p>
          )}
          {!canChat && (
            <p className="pb-2 text-sm text-amber-300">
              Connect your wallet to enable the AI chat.
            </p>
          )}
        {uploadingImage && (
          <div className="pb-4 flex items-center gap-2 text-sm text-cyan-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading image...</span>
          </div>
        )}
        {canChat && !isLoading && !uploadingImage && inputFocused && !input.trim().length && (
            <div className="pb-4 flex gap-3 text-sm text-slate-200">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 justify-start border-cyan-400/30 bg-slate-700/40 text-slate-200 hover:bg-slate-700/60"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                Send Receipt
              </Button>
              <Link href="/receipts" className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-cyan-400/30 bg-slate-700/40 text-slate-200 hover:bg-slate-700/60"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  View Spending Report
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 justify-start border-cyan-400/30 bg-slate-700/40 text-slate-200 hover:bg-slate-700/60"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => window.open("/settings", "_blank")}
              >
                Settings
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="border-cyan-400/30 hidden bg-slate-800/50 text-cyan-400 hover:bg-slate-700/50 hover:text-cyan-300"
            >
              {uploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={uploadingImage ? "Uploading image..." : inputPlaceholder}
              disabled={!canChat || isLoading || uploadingImage}
              className="flex-1 border-cyan-400/30 bg-slate-800/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <Button
              onClick={handleSend}
              disabled={
                isLoading || uploadingImage || !canChat || (!input.trim() && !selectedImage)
              }
              variant="web3"
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
        </div>
      </div>
    </div>
  )
}

