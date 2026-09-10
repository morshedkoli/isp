import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The report PDF reads the Bengali font off disk at request time, and Next's
  // dependency tracing cannot see a runtime readFileSync — without this the
  // font is missing from the serverless bundle and Bengali names silently
  // disappear from generated reports.
  outputFileTracingIncludes: {
    '/api/reports/pdf': ['./src/lib/fonts/**'],
  },
};

export default nextConfig;
