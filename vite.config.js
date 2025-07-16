import { defineConfig } from "vite";
import nixPlugin from "./nix-plugin.ts";

export default defineConfig({
  plugins: [
    nixPlugin(),
  ],
  build: {
    target: "esnext",
    module: "esm",
  },
  server: {
    fs: {
      allow: ["/nix/store", "."],
    },
  },
});
