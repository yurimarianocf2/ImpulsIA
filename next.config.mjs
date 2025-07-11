/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.infrastructureLogging = {
      level: 'warn',
    };
    return config;
  },
};

export default nextConfig; 