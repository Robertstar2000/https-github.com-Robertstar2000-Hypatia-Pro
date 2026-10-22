import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function suppressHmrPlugin() {
  return {
    name: 'suppress-hmr-ws',
    transformIndexHtml: {
      order: 'pre' as const,
      handler() {
        return [
          {
            tag: 'script',
            children: `
(function() {
  if (typeof window !== 'undefined' && window.WebSocket) {
    var OrigWS = window.WebSocket;
    var MockWS = function(url, protocols) {
      if (protocols === 'vite-hmr' || (typeof url === 'string' && (url.includes('token=') || url.includes('vite-hmr')))) {
        var listeners = {};
        return {
          readyState: 1,
          OPEN: 1,
          CLOSED: 3,
          CLOSING: 2,
          CONNECTING: 0,
          send: function() {},
          close: function() {},
          addEventListener: function(event, fn) {
            listeners[event] = listeners[event] || [];
            listeners[event].push(fn);
            if (event === 'open') setTimeout(fn, 0);
          },
          removeEventListener: function(event, fn) {
            if (listeners[event]) listeners[event] = listeners[event].filter(function(f) { return f !== fn; });
          },
          dispatchEvent: function() { return true; }
        };
      }
      return new OrigWS(url, protocols);
    };
    MockWS.prototype = OrigWS.prototype;
    MockWS.OPEN = 1;
    MockWS.CLOSED = 3;
    MockWS.CLOSING = 2;
    MockWS.CONNECTING = 0;
    window.WebSocket = MockWS;
  }
})();
`,
            injectTo: 'head-prepend' as const
          }
        ];
      }
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: Number(process.env.PORT) || 3000,
        host: '0.0.0.0',
        hmr: false,
      },
      plugins: [suppressHmrPlugin(), react()],
      define: {
        // Safe client environment defines - Secrets are strictly held server-side in Secret Manager
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
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
