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
    // Handle native .node binaries
    config.module.rules.push({
      test: /\.node$/,
      loader: 'node-loader',
    });
    
    // Handle canvas and other native dependencies that pdf-to-png-converter uses
    if (isServer) {
      // Externalize native modules
      config.externals = [...(config.externals || [])];
      
      // Don't try to bundle native modules
      config.externalsPresets = { ...config.externalsPresets, node: true };
    }
    
    // Ignore specific native modules that should not be processed
    config.resolve.alias = {
      ...config.resolve.alias,
      '@napi-rs/canvas': false,
      'canvas': false,
    };
    
    return config;
  },
  
  // Experimental features for better PDF handling
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Allow larger file uploads for PDFs
    },
    // Use server components by default for API routes
    serverComponentsExternalPackages: [
      'pdf-to-png-converter',
      '@napi-rs/canvas',
      'canvas'
    ],
  },
};

export default nextConfig;