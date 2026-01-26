import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type checking during build for Railway deployment
  // We handle these in CI/CD separately
  typescript: {
    ignoreBuildErrors: true,
  },
  // Note: eslint config removed as it's deprecated in Next.js 16
  // Use .eslintrc.json or run `next lint` separately instead
  
  // Turbopack is now default in Next.js 16
  turbopack: {},
  
  // Experimental features for better PDF handling
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Allow larger file uploads for PDFs
    },
  },
};

export default nextConfig;