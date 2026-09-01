/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 ships a native binary — it must run as a real Node
  // module on the server, not be bundled by webpack/Turbopack.
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
