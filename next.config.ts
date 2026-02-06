import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Rewrite unversioned /api/* to /api/v1/* for backward compatibility.
  // Explicit per-route — a wildcard /api/:path* would double-prefix /api/v1/ requests.
  async rewrites() {
    return [
      { source: '/api/exoplanets', destination: '/api/v1/exoplanets' },
      { source: '/api/exoplanets/:id', destination: '/api/v1/exoplanets/:id' },
      { source: '/api/stars', destination: '/api/v1/stars' },
      { source: '/api/stars/:id', destination: '/api/v1/stars/:id' },
      { source: '/api/stars/:id/planets', destination: '/api/v1/stars/:id/planets' },
      { source: '/api/small-bodies', destination: '/api/v1/small-bodies' },
      { source: '/api/small-bodies/:id', destination: '/api/v1/small-bodies/:id' },
      { source: '/api/close-approaches', destination: '/api/v1/close-approaches' },
      { source: '/api/apod', destination: '/api/v1/apod' },
      { source: '/api/fireballs', destination: '/api/v1/fireballs' },
      { source: '/api/space-weather', destination: '/api/v1/space-weather' },
      { source: '/api/space-weather/:id', destination: '/api/v1/space-weather/:id' },
      { source: '/api/images/object', destination: '/api/v1/images/object' },
    ];
  },
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
