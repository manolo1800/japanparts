/** @type {import('next').NextConfig} */
const backendInternalUrl =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.INTERNAL_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'http://backend:4000' : 'http://localhost:4000');

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@japonparts/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendInternalUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
