import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  minify: true,
  splitting: false,
  treeshake: false,
  external: ['pg', '@types/pg'],
  esbuildOptions(options) {
    // Preserve method names during minification (critical for our mapOperator method)
    options.keepNames = true;
  },
});