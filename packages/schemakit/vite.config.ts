import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SchemaKit',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        'pg', 
        'better-sqlite3', 
        'fs', 
        'path', 
        'crypto',
        'util',
        'stream',
        'events'
      ],
      output: {
        format: 'es'
      }
    },
    sourcemap: false,
    minify: 'terser',
    target: 'node14'
  },
  plugins: [
    
  ]
});
