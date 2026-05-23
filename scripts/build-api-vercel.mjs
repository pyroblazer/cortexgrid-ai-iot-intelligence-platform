/**
 * esbuild script to bundle the Vercel serverless API entry point.
 *
 * Compiles api/index.ts (which imports from apps/api/src/) into a single
 * api/index.js file that Vercel's Node.js runtime can execute directly.
 */
import { build } from 'esbuild';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

await build({
  entryPoints: [join(root, 'api/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: join(root, 'api/index.js'),
  external: [
    // Native modules that can't be bundled
    'pg-native',
    'bcrypt',
    // Large deps that should be resolved by Vercel's node_modules
    '@prisma/client',
    '.prisma/client',
    '@prisma/engines',
    'ioredis',
    'socket.io',
    'groq-sdk',
    'stripe',
    'nodemailer',
    'class-transformer',
    'class-validator',
    '@nestjs/core',
    '@nestjs/common',
    '@nestjs/platform-express',
    '@nestjs/config',
    '@nestjs/swagger',
    '@nestjs/throttler',
    '@nestjs/bullmq',
    '@nestjs/websockets',
    '@nestjs/microservices',
    '@willsoto/nestjs-prometheus',
    'reflect-metadata',
    'rxjs',
    'express',
    'helmet',
    'multer',
  ],
  format: 'esm',
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
  logLevel: 'info',
});
