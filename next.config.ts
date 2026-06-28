import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Build de imagem Docker enxuta (server.js standalone) para self-host fora da Vercel.
  output: "standalone",
  // argon2 e o client gerado do Prisma usam bindings nativos; manter externos evita
  // que o bundler do Next tente empacota-los (quebraria o binario .node em runtime).
  serverExternalPackages: ["argon2", "@prisma/client", "@prisma/adapter-pg"],
};

export default nextConfig;
