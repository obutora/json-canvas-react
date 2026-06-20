import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev playground served from /dev, importing the library source directly.
export default defineConfig({
  root: "dev",
  plugins: [react()],
  server: { port: 5174, open: false },
});
