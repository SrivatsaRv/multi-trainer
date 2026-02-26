/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'standalone',
    async rewrites() {
        const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8000';
        console.log('Backend URL for Rewrites:', BACKEND_URL); // Log to see if it loads
        return [
            {
                source: '/api/v1/:path*',
                destination: `${BACKEND_URL}/api/v1/:path*`,
            },
        ]
    }
};

module.exports = nextConfig;
