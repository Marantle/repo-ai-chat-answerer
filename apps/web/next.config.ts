import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ['@repo-slop/core', '@repo-slop/db'],
  serverExternalPackages: [],
}

export default nextConfig
