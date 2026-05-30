import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@hoopmanager/db", "@hoopmanager/engine"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default config;
