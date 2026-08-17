import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src');
const VIRTUAL_PREFIX = '\0idm-src:';

function stripQuery(id) {
  return id.split('?')[0].split('#')[0];
}

function toSrcRel(absolutePath) {
  const rel = path.relative(srcDir, absolutePath).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..')) {
    return null;
  }
  return rel;
}

function resolveExistingFile(basePath) {
  const candidates = [
    basePath,
    `${basePath}.jsx`,
    `${basePath}.js`,
    `${basePath}.tsx`,
    `${basePath}.ts`,
    `${basePath}.css`,
    path.join(basePath, 'index.jsx'),
    path.join(basePath, 'index.js'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function virtualSrcPlugin() {
  return {
    name: 'virtual-src-no-apostrophe',
    enforce: 'pre',
    resolveId(source, importer) {
      const bare = stripQuery(source);
      if (bare.startsWith(VIRTUAL_PREFIX)) {
        return bare;
      }
      let absolute = null;
      if (bare.startsWith('/src/')) {
        absolute = resolveExistingFile(path.join(srcDir, bare.slice('/src/'.length)));
      } else if (bare.startsWith('./') || bare.startsWith('../')) {
        const importerPath = importer ? stripQuery(importer) : '';
        const fromDir = importerPath.startsWith(VIRTUAL_PREFIX)
          ? path.join(srcDir, path.dirname(importerPath.slice(VIRTUAL_PREFIX.length)))
          : importerPath
            ? path.dirname(importerPath)
            : srcDir;
        absolute = resolveExistingFile(path.resolve(fromDir, bare));
      }
      if (!absolute) {
        return null;
      }
      const rel = toSrcRel(absolute);
      if (!rel) {
        return null;
      }
      if (/\.css$/i.test(rel)) {
        return absolute;
      }
      return VIRTUAL_PREFIX + rel;
    },
    load(id) {
      const bare = stripQuery(id);
      if (!bare.startsWith(VIRTUAL_PREFIX)) {
        return null;
      }
      const rel = bare.slice(VIRTUAL_PREFIX.length);
      const file = path.join(srcDir, rel);
      const source = fs.readFileSync(file, 'utf8');
      if (!/\.[jt]sx$/.test(file)) {
        return source;
      }
      const result = esbuild.transformSync(source, {
        loader: file.endsWith('.tsx') ? 'tsx' : 'jsx',
        jsx: 'automatic',
        sourcefile: rel.replace(/\\/g, '/'),
      });
      return result.code;
    },
  };
}

export default defineConfig({
  plugins: [virtualSrcPlugin(), react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
