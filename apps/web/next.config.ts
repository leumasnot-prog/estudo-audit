import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@auditor-ai/db"],
  // Sobe o rastreamento de arquivos até a raiz do monorepo, senão o
  // bundle da função serverless não inclui o engine do Prisma
  // hospedado em packages/db/node_modules/.prisma (pnpm workspace).
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // O tracing automático do Next não copia o engine binário do Prisma
  // hospedado no virtual store do pnpm — força a inclusão. Glob com
  // wildcard de versão porque o hash do @prisma+client@ varia.
  outputFileTracingIncludes: {
    "/**/*": [
      "../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*",
    ],
  },
};

export default nextConfig;
