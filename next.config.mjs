/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "images.pexels.com" },
      { hostname: "randomuser.me" },
      { hostname: "res.cloudinary.com" }, // Add this line
    ],
  },
};

export default nextConfig;
