// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Load non-VITE_ env vars into process.env for server-side code only.
// These are never added to client define config, so secrets stay server-side.
const serverEnv = loadEnv(process.env['NODE_ENV'] ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

const entitiesRoot = path.resolve(process.cwd(), "node_modules/entities");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        "entities/lib/decode.js": path.join(entitiesRoot, "lib/decode.js"),
        "entities/lib/encode.js": path.join(entitiesRoot, "lib/encode.js"),
        entities: entitiesRoot,
      },
    },
  },
});
