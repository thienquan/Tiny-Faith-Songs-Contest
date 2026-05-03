/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Allow large multipart bodies through any Server Action / Route handler.
  // (We POST to the FastAPI backend on /api/* via the K8s ingress, so this
  // mostly affects Next.js dev tooling). Keep the option for safety.
  experimental: {
    serverActions: {
      bodySizeLimit: '2gb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
