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
      {
        protocol: 'https',
        hostname: 'images-assets.nasa.gov',
      },
      // APOD images can come from various NASA subdomains
      {
        protocol: 'https',
        hostname: 'apod.nasa.gov',
      },
      {
        protocol: 'https',
        hostname: '*.nasa.gov',
      },
      // YouTube thumbnails for video APODs
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      // Vimeo thumbnails
      {
        protocol: 'https',
        hostname: 'i.vimeocdn.com',
      },
    ],
  },
};

export default nextConfig;
