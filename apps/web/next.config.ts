import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ['@proofpack/core'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
  eslint: {
    // Linting runs in the root `pnpm check` gate.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
