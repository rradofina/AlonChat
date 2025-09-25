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
  webpack: (config, { isServer, dev }) => {
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

    // Fix Jest worker error in Next.js 15
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        runtimeChunk: false,
        splitChunks: {
          cacheGroups: {
            default: false,
          },
        },
      }

      // Disable worker processes
      const TerserPlugin = config.optimization.minimizer?.find(
        plugin => plugin.constructor.name === 'TerserPlugin'
      )
      if (TerserPlugin) {
        TerserPlugin.options.parallel = false
      }
    }

    return config
  },
  // Add pdfjs-dist to webpack externals for server-side
  serverExternalPackages: ['pdfjs-dist'],
}

module.exports = nextConfig