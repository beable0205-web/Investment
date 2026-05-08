import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    outputFileTracingExcludes: {
      '*': ['**/.git/**/*', '**/기본적분석/**/*', '**/기술적분석/**/*'],
    },
  },
};

export default nextConfig;
