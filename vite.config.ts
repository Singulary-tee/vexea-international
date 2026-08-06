import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';
import { codecovVitePlugin } from "@codecov/vite-plugin";

export default defineConfig(() => {
  // Automatically restore Draco and Basis loader libraries from node_modules into client/public on build and dev start
  try {
    const copyFolderRecursiveSync = (source: string, target: string) => {
      if (!fs.existsSync(source)) return;
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
      }
      const files = fs.readdirSync(source);
      for (const file of files) {
        const curSource = path.join(source, file);
        const curTarget = path.join(target, file);
        if (fs.lstatSync(curSource).isDirectory()) {
          copyFolderRecursiveSync(curSource, curTarget);
        } else {
          fs.copyFileSync(curSource, curTarget);
        }
      }
    };

    const nodeModulesDraco = path.join(process.cwd(), 'node_modules/three/examples/jsm/libs/draco');
    const nodeModulesBasis = path.join(process.cwd(), 'node_modules/three/examples/jsm/libs/basis');
    const publicDraco = path.join(process.cwd(), 'client/public/draco');
    const publicBasis = path.join(process.cwd(), 'client/public/basis');

    copyFolderRecursiveSync(nodeModulesDraco, publicDraco);
    copyFolderRecursiveSync(nodeModulesBasis, publicBasis);
    console.log('[VITE SETUP] Successfully synchronized Draco and Basis decoder libraries from node_modules into client/public.');
  } catch (err) {
    console.warn('[VITE SETUP] Draco/Basis synchronization warning:', err);
  }

  return {
    root: 'client',
    plugins: [
      tailwindcss(),
      {
        name: 'configure-response-headers',
        configureServer: (server) => {
          server.middlewares.use((_req, res, next) => {
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            next();
          });
        },
      },
      codecovVitePlugin({
        enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
        bundleName: "vexea",
        uploadToken: process.env.CODECOV_TOKEN,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: '../dist/client',
      emptyOutDir: true,
      assetsInlineLimit: 0,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var, and also disabled
      // when running on Cloud Run (K_SERVICE is set) to prevent WebSocket errors
      // on remote deployments where the HMR WebSocket cannot be reached.
      hmr: process.env.DISABLE_HMR !== 'true' && !process.env.K_SERVICE,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      }
    },
  };
});
