/** @type {import('next').NextConfig} */
const config = {
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
