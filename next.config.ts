import type { NextConfig } from "next";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function isReactCompilerAvailable(): boolean {
  try {
    require.resolve("babel-plugin-react-compiler/package.json");
    return true;
  } catch {
    return false;
  }
}

const reactCompilerEnabled = isReactCompilerAvailable();

if (!reactCompilerEnabled) {
  console.warn(
    "[next.config] React Compiler disabled because babel-plugin-react-compiler is not installed.",
  );
}

const nextConfig: NextConfig = {
  reactCompiler: reactCompilerEnabled,
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
      { source: '/api/space-weather/overview', destination: '/api/v1/space-weather/overview' },
      { source: '/api/space-weather/alerts', destination: '/api/v1/space-weather/alerts' },
      { source: '/api/space-weather/notifications', destination: '/api/v1/space-weather/notifications' },
      { source: '/api/space-weather/solar/suvi', destination: '/api/v1/space-weather/solar/suvi' },
      { source: '/api/space-weather/solar/drap', destination: '/api/v1/space-weather/solar/drap' },
      { source: '/api/space-weather/solar/flare-forecast', destination: '/api/v1/space-weather/solar/flare-forecast' },
      { source: '/api/space-weather/geomagnetic/hp30', destination: '/api/v1/space-weather/geomagnetic/hp30' },
      { source: '/api/space-weather/geomagnetic/ae', destination: '/api/v1/space-weather/geomagnetic/ae' },
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
      {
        protocol: 'http',
        hostname: 'images-assets.nasa.gov',
      },
      {
        protocol: 'https',
        hostname: 'assets.nasa.gov',
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
      {
        protocol: 'https',
        hostname: 'services.swpc.noaa.gov',
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
