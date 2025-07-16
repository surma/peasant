import { defineConfig } from "vite";

export default defineConfig({
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
