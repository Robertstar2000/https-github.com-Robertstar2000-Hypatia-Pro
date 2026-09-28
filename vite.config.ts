import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: Number(process.env.PORT) || 3000,
        host: '0.0.0.0',
        hmr: false,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                // Strictly group core React packages to avoid circular dependencies with other libraries
                if (
                  id.includes('node_modules/react/') ||
                  id.includes('node_modules/react-dom/') ||
                  id.includes('node_modules/scheduler/')
                ) {
                  return 'react-vendor';
                }
                if (id.includes('recharts') || id.includes('d3')) return 'charts-vendor';
                if (id.includes('chart.js')) return 'chartjs-vendor';
                if (id.includes('xlsx')) return 'xlsx-vendor';
                if (id.includes('jspdf') || id.includes('pptxgenjs') || id.includes('html2canvas') || id.includes('jszip')) return 'export-vendor';
                return 'libs-vendor';
              }
            }
          }
        }
      }
    };
});
