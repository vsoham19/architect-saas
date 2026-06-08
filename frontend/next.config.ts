import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.supabase_url || "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.supabase_key || "",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  },
  turbopack: {
    root: "..",
  },
};

export default nextConfig;
