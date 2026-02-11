import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "a0.muscache.com" },
      { protocol: "https", hostname: "**.muscache.com" },
      { protocol: "https", hostname: "**.vrbo.com" },
      { protocol: "https", hostname: "**.bstatic.com" },
    ],
  },
};

export default nextConfig;
