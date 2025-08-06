import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: true, // 🎯 Enable minification
  splitting: true, // 📦 Code splitting for better performance
  treeshake: true, // 🌳 Remove unused code
  outDir: 'dist',
  external: ['pg', '@types/pg'],
});