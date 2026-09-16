import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import path from 'node:path';
import fs from 'node:fs';

const resolveModule = (pkg: string, fallback?: string) => {
  const root = path.resolve(__dirname, '../node_modules', pkg);
  if (fs.existsSync(root)) return root;
  return fallback ? path.resolve(__dirname, '../node_modules', fallback) : root;
};
export default defineConfig({
  plugins: [react(), wasm()],
  define: { 'process.env': {}, global: 'globalThis' },
  build: { target: 'es2022' },
  resolve: { alias: {
    '@midnight-ntwrk/ledger-v8': resolveModule('@midnight-ntwrk/ledger-v8', '@midnight-ntwrk/midnight-js-protocol/node_modules/@midnight-ntwrk/ledger-v8'),
    '@midnight-ntwrk/onchain-runtime-v3': resolveModule('@midnight-ntwrk/onchain-runtime-v3', '@midnight-ntwrk/compact-runtime/node_modules/@midnight-ntwrk/onchain-runtime-v3'),
    'isomorphic-ws': path.resolve(__dirname, './src/isomorphic-ws-fix.mjs'),
    buffer: 'buffer',
  }},
});
