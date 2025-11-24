import type { Metadata } from "next";
import "./globals.css";
import { AptosWalletProvider } from "@/components/providers/aptos-wallet-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Admin Portal - PDTT",
  description: "Admin Portal for Personal Data Tokenization and Trading Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="antialiased"
      >
        <AptosWalletProvider>
          {children}
          <Toaster />
        </AptosWalletProvider>
      </body>
    </html>
  );
}
