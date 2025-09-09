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
  
  // Webpack configuration for better handling of native modules
  webpack: (config, { isServer }) => {
    // Handle canvas and other native dependencies that pdf-to-png-converter might use
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    }
    
    // Ensure proper handling of binary files
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/,
      type: 'asset/resource',
    });
    
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