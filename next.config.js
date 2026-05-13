/** @type {import('next').NextConfig} */
const nextConfig = {
    // 1. External Packages (Vercel Build Fix)
    // Avoid bundling server-side only modules that use native file system.
    serverExternalPackages: ['sharp', 'fs', 'path'],

    // 2. Image Optimization (Remote Patterns)
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'drive.google.com' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
        ],
    },

    // 3. Server Actions Config
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },

    // 4. Webpack Specific: FS Fallback + Watch Ignore
    webpack: (config, { isServer, dev }) => {
        if (!isServer) {
            config.resolve.fallback = {
                fs: false,
                path: false,
                os: false,
            };
        }
        // Exclude directories from hot-reload watching.
        // The bridge/ dir contains large JSON & log files that change every sync cycle,
        // causing webpack to rebuild constantly → high RAM & CPU usage.
        // NOTE: This only works with webpack (npm run dev --no-turbo).
        //       Turbopack does NOT respect this config — hence the --no-turbo flag in package.json.
        if (dev) {
            config.watchOptions = {
                ...config.watchOptions,
                ignored: [
                    '**/node_modules/**',
                    '**/.git/**',
                    '**/bridge/**',
                    '**/.next/**',
                ],
            };
        }
        return config;
    },

    // 5. Turbopack fallback config
    // Silence Turbopack warning when a custom webpack config is present
    turbopack: {},
};

module.exports = nextConfig;
