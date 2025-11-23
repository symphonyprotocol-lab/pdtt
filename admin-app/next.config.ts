import type { NextConfig } from "next";

const getGatewayHostname = () => {
  try {
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";
    const url = new URL(gatewayUrl);
    return url.hostname;
  } catch {
    return "gateway.pinata.cloud";
  }
};

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: getGatewayHostname(),
        pathname: "/ipfs/**",
      },
      // Also allow common Pinata gateway patterns
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "*.mypinata.cloud",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
