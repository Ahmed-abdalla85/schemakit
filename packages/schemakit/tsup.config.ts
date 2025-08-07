import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    // Generate declaration files but ignore errors for optional dependencies
    compilerOptions: {
      skipLibCheck: true,
      moduleResolution: 'node'
    }
  },
  clean: true,
  minify: true,
  splitting: false,
  treeshake: false,
  external: [
    // Database drivers
    'pg',
    '@types/pg',
    'better-sqlite3',
    'mysql2',
    'mysql2/promise',
    // Drizzle ORM
    'drizzle-orm',
    'drizzle-orm/node-postgres',
    'drizzle-orm/better-sqlite3',
    'drizzle-orm/mysql2'
  ],
  esbuildOptions(options) {
    // Preserve method names during minification (critical for our mapOperator method)
    options.keepNames = true;
  },
});