import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Bind explicitly so http://127.0.0.1:5173/ always works (avoids IPv6-only localhost quirks).
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    open: true,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        tools: path.resolve(__dirname, "tools/index.html"),
      },
    },
  },
}));
