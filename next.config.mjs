/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/files/:path*',
      },
    ]
  },
}

export default nextConfig
