import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    agentUpgrade: "security",
  },
  serverExternalPackages: ["@daytona/sdk"],
}

export default nextConfig
