import { applyD1Migrations, env } from "cloudflare:test";

// Runs once before the suite; isolated per-test storage is seeded from the
// resulting state, so every test starts with the schema already in place.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
