import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  experimental: {
    serverActions: {
      allowedOrigins: [
        'sirama.pnb.ac.id',
        'abdiserver.tailee8978.ts.net',
      ],
    },
  },
};

export default nextConfig;
