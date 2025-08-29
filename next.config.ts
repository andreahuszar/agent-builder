import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type checking and linting during build for Railway deployment
  // We handle these in CI/CD separately
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Standalone output for optimized Docker deployments
  output: 'standalone',
};

export default nextConfig;
