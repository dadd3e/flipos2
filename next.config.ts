
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  // typescript: {
  //   ignoreBuildErrors: true, // Removed for stricter checking
  // },
  // eslint: {
  //   ignoreDuringBuilds: true, // Removed for stricter checking
  // },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.etsystatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.etsystatic.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
