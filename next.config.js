/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // Prevent webpack from bundling server-only packages that use Node.js internals
  serverExternalPackages: ['@anthropic-ai/sdk'],
}

module.exports = nextConfig
