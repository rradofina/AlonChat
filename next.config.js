/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Configure webpack for pdfjs-dist
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }

    // Add rule for PDF.js worker
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }

    return config
  },
  // Add pdfjs-dist to webpack externals for server-side
  serverExternalPackages: ['pdfjs-dist'],
}

module.exports = nextConfig