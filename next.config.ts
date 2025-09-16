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
  // output: 'standalone',
  
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle server-side configuration
    if (isServer) {
      // Don't try to bundle native modules
      config.externalsPresets = { ...config.externalsPresets, node: true };
    }

    return config;
  },
  
  // Experimental features for better PDF handling
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Allow larger file uploads for PDFs
    },
  },
};

export default nextConfig;