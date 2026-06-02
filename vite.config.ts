import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// @better-auth/kysely-adapter 1.6.13 imports DEFAULT_MIGRATION_TABLE from
// 'kysely' main, but kysely 0.29.x moved those to 'kysely/migration'.
// Patch any adapter dialect file that has this broken import.
function kyselyCompatPlugin(): Plugin {
  return {
    name: "kysely-compat",
    transform(code) {
      if (!code.includes("DEFAULT_MIGRATION_TABLE") || !code.includes(`from "kysely"`)) {
        return;
      }
      return code.replace(
        /import\s*\{([^}]*DEFAULT_MIGRATION[^}]*)\}\s*from\s*["']kysely["']/g,
        (_, imports) => {
          const remaining = imports
            .split(",")
            .map((s: string) => s.trim())
            .filter(
              (s: string) =>
                s !== "DEFAULT_MIGRATION_TABLE" &&
                s !== "DEFAULT_MIGRATION_LOCK_TABLE",
            )
            .filter(Boolean)
            .join(", ");
          const kyselyImport = remaining
            ? `import { ${remaining} } from "kysely"`
            : "";
          return `${kyselyImport};\nconst DEFAULT_MIGRATION_TABLE = "kysely_migration";\nconst DEFAULT_MIGRATION_LOCK_TABLE = "kysely_migration_lock"`;
        },
      );
    },
  };
}

export default defineConfig({
	plugins: [kyselyCompatPlugin(), react(), cloudflare(), tailwindcss()],
	resolve: {
		alias: {
		  "@": path.resolve(__dirname, "./src"),
		},
	  },
});
