/** @type {import('next').NextConfig} */
const nextConfig = {
  // passkit-generator signs with node-forge and uses Node APIs, so load it from
  // node_modules at runtime instead of bundling it.
  serverExternalPackages: ["passkit-generator"],
};

module.exports = nextConfig;
