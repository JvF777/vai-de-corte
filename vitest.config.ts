import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mesmo atalho "@/..." do tsconfig.
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
});
