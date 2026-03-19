/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Enabled for Capacitor builds only
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
