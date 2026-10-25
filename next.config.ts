import type { NextConfig } from "next";

// Content Security Policy: only the hosts this app actually uses.
// Frames: YouTube (official trailers, privacy-enhanced domain) and the
// Internet Archive embed player. Media: Wikimedia Commons video files.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://image.tmdb.org https://www.themoviedb.org https://archive.org https://*.archive.org https://commons.wikimedia.org https://upload.wikimedia.org https://thumb.wikimedia.org",
  "media-src https://upload.wikimedia.org",
  "frame-src https://www.youtube-nocookie.com https://archive.org",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The Archive library is read from disk at runtime (src/lib/archiveLibrary.ts).
  outputFileTracingIncludes: { "/**": ["./data/archive-library.json.gz", "./data/streaming-directory.json.gz"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
