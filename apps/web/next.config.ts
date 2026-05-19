import "@better-auth-devtools/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	transpilePackages: ["@better-auth-devtools/devtools"],
	devIndicators: false,
};

export default nextConfig;
