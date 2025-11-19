import type { NextConfig } from "next";

// Extract hostname from gateway URL for image configuration
const getGatewayHostname = () => {
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs";
  try {
    const url = new URL(gatewayUrl);
    return url.hostname;
  } catch {
    return "gateway.pinata.cloud";
  }
};

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["http://192.168.31.186:3000"],
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
    ],
  },
};

export default nextConfig;
