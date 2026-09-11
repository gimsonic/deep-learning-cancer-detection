import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "http://3.110.144.29/:path*",
      },
    ];
  },
};

export default nextConfig;
