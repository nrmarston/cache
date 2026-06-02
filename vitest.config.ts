import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

const root = path.dirname(fileURLToPath(import.meta.url));

// Apply the real D1 migrations to the test database so the service tests run
// against the same schema as production (including the image_url rename).
export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(root, "migrations"));

  return {
    resolve: {
      alias: { "@": path.join(root, "src") },
    },
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
      poolOptions: {
        workers: {
          singleWorker: true,
          miniflare: {
            compatibilityDate: "2025-10-08",
            compatibilityFlags: ["nodejs_compat"],
            d1Databases: { DB: "test-bookmarks" },
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
