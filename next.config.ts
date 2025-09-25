import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions are stable in modern Next, but we use API routes here for clarity.
  },
  reactStrictMode: true
};

export default nextConfig;
