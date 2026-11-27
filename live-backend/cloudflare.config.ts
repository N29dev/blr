import { bindings, defineConfig, exports } from "cf/config";
import * as entrypoint from "./worker.mjs" with { type: "cf-worker" };

export default defineConfig({
  worker: {
    name: "blr-live-demo",
    entrypoint,
    compatibilityDate: "2026-11-17",
    exports: {
      LiveDemoRoom: exports.durableObject({ storage: "sqlite" }),
    },
    env: {
      LIVE_DEMO: bindings.durableObject({ worker: "blr-live-demo", exportName: "LiveDemoRoom" }),
      LIVE_DEMO_TOKEN: bindings.secret(),
    },
  },
});
