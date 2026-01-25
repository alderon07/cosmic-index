import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external API domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'exoplanetarchive.ipac.caltech.edu',
      },
      {
        protocol: 'https',
        hostname: 'ssd-api.jpl.nasa.gov',
      },
    ],
  },
};

export default nextConfig;
