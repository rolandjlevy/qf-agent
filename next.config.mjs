/** @type {import('next').NextConfig} */
const nextConfig = {
  // libsql (the local-file engine behind @libsql/client) ships a native
  // binary — it must run as a real Node module on the server, not be
  // bundled by webpack/Turbopack.
  serverExternalPackages: ['libsql'],
};

export default nextConfig;
