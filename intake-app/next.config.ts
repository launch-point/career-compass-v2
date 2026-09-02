import type { NextConfig } from 'next';

// Iframe policy (Section E): the intake app is embedded inside Mission Control.
// We control WHO may frame it with CSP `frame-ancestors` (a static policy, so it
// goes through the config headers() — no proxy/nonce needed for this part).
// Direct top-level visits are unaffected by frame-ancestors, so an authenticated
// client can also open the app directly. We deliberately do NOT set
// X-Frame-Options: DENY, which would block all framing.
const mcOrigin = process.env.MISSION_CONTROL_ORIGIN;
const frameAncestors = ["'self'", mcOrigin].filter(Boolean).join(' ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: `frame-ancestors ${frameAncestors};` },
        ],
      },
    ];
  },
};

export default nextConfig;
