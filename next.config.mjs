/** @type {import('next').NextConfig} */
const nextConfig = {
  // Forward Amplify env vars to the Next.js server runtime.
  // These are NOT exposed to the client bundle — only server
  // components, API routes, and middleware can access them.
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
  },
};

export default nextConfig;
