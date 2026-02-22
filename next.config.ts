import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {},
  serverExternalPackages: ['mysql2'],
};

export default nextConfig;
