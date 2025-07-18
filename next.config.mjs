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

    // Handle canvas module for server-side rendering
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        canvas: "commonjs canvas",
      });
    }

    // Handle optional canvas dependency
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };

    return config;
  },
  // Configure output for standalone deployment
  output: "standalone",
  // Set to true to enable static export
  // This will disable server components in the build
  // which is appropriate for deployment to static hosting environments
  // like Render's static sites
  staticPageGenerationTimeout: 180,
  experimental: {
    // Allow more time for static rendering
    serverComponentsExternalPackages: ["canvas"],
  },
};

export default nextConfig;
