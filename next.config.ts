import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NEXT_EXPORT ? "export" : "standalone",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
