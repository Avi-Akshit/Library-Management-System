import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repoBasePath = "/Library-Management-System";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? repoBasePath : undefined,
  assetPrefix: isGitHubPages ? repoBasePath : undefined,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: isGitHubPages ? "" : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"),
    NEXT_PUBLIC_BASE_PATH: isGitHubPages ? repoBasePath : "",
  },
};

export default nextConfig;
