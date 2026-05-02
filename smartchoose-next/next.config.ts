import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint errors won't block production builds (TypeScript type checks still run)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

