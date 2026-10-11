// Bundles the chess engine worker into a self-contained classic worker that
// runs offline from public/aiWorker.js (works in dev, static export and the
// Android APK without any runtime imports).
import { build } from "esbuild";

await build({
  entryPoints: ["src/lib/chess/aiWorker.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  minify: true,
  outfile: "public/aiWorker.js",
});

console.log("aiWorker bundled -> public/aiWorker.js");
