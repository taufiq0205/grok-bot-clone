import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["@daytona/sdk"],
}

export default nextConfig
