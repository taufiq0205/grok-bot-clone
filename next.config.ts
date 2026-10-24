import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_CLERK_JS_VERSION: "6.40.0",
    NEXT_PUBLIC_CLERK_UI_VERSION: "1.40.0",
  },
  experimental: {
    agentUpgrade: "security",
  },
  serverExternalPackages: ["@daytona/sdk"],
}

export default nextConfig
