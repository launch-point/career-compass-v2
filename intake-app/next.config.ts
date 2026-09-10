import type { NextConfig } from 'next';

// Iframe policy (Section E): the intake app is embedded inside Mission Control.
// We control WHO may frame it with CSP `frame-ancestors` (a static policy, so it
// goes through the config headers() — no proxy/nonce needed for this part).
// Direct top-level visits are unaffected by frame-ancestors, so an authenticated
// client can also open the app directly. We deliberately do NOT set
// X-Frame-Options: DENY, which would block all framing.
const mcOrigin = process.env.MISSION_CONTROL_ORIGIN;
// Clients reach Mission Control through the Circle community (/job-tracker), so the
// real chain is Circle → Mission Control → this app. frame-ancestors is checked
// against EVERY ancestor, not just the parent, so Circle must be allowed too.
// Hardcoded rather than an env var: it is the same in every environment and there
// is no local Circle. Origin only (no path); the www. must match exactly.
const circleOrigin = 'https://www.group.ministrytomarketplace.co';
const frameAncestors = ["'self'", mcOrigin, circleOrigin].filter(Boolean).join(' ');

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
