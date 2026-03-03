import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ['@proofpack/core'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
  generateBuildId: async () => process.env.PROOFPACK_BUILD_ID ?? 'proofpack-dev-build',
  eslint: {
    // Linting runs in the root `pnpm check` gate.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
