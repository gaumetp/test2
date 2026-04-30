import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@tattoo-saas/api", "@tattoo-saas/db", "@tattoo-saas/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["postgres"],
  },
};

export default config;
