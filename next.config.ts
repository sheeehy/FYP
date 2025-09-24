/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pinimg.com', // using pinterest for now
      },
      {
        protocol: 'https',
        hostname: '**', 
      },
    ],
  },
}

export default nextConfig
