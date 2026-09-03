/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // In GitHub Codespaces / this devcontainer, the browser hits the app via
      // the public *.app.github.dev forwarded URL (becomes x-forwarded-host),
      // but the request's `origin` header still says localhost:3000 — Next's
      // Server Actions origin check rejects that mismatch by default
      // ("Invalid Server Actions request"). Allow-list both.
      allowedOrigins: ['localhost:3000', '*.app.github.dev'],
    },
  },
}

export default nextConfig
