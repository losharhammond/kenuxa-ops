import type { NextConfig } from "next";

const isDocker = process.env.DOCKER_BUILD === "1";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  experimental: {
    typedRoutes: false,
  },
  // standalone output for Docker — disabled on Windows dev to avoid ENOENT race
  ...(isDocker ? { output: "standalone" } : { outputFileTracing: false }),
};

export default nextConfig;
