import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "@modelcontextprotocol/sdk"],
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
