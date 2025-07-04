/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { hostname: "images.pexels.com" },
      { hostname: "randomuser.me" },
      { hostname: "res.cloudinary.com" }, // Add this line
    ],
  },
  webpack: (config, { isServer }) => {
    // Suppress the critical dependency warning for Supabase RealtimeClient
    if (!config.ignoreWarnings) {
      config.ignoreWarnings = [];
    }
    config.ignoreWarnings.push({
      module:
        /node_modules\/@supabase\/realtime-js\/dist\/main\/RealtimeClient\.js$/,
      message: /Critical dependency/,
    });

    return config;
  },
  // Add configuration for dynamic routes
  experimental: {
    missingSuspenseWithCSRError: false,
  },
  // Configure routes that should not be statically generated
  output: "standalone",
  generateStaticParams: async () => {
    return [];
  },
};

export default nextConfig;
