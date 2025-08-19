
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@opentelemetry/api', '@opentelemetry/context-async-hooks', '@opentelemetry/instrumentation', '@opentelemetry/resources', '@opentelemetry/sdk-trace-base', '@opentelemetry/sdk-trace-node'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
