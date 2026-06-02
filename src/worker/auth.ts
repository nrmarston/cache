import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";

export type Env = {
  DB: D1Database;
  IMAGES: R2Bucket;
  PUBLIC_IMAGE_BASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ALLOWED_EMAILS: string;
};

function allowedEmailEntries(env: Env): string[] {
  return env.ALLOWED_EMAILS.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function isApprovedEmail(email: string, env: Env): boolean {
  const normalizedEmail = email.trim().toLowerCase();

  return allowedEmailEntries(env).some((entry) => {
    if (entry.startsWith("@")) {
      return normalizedEmail.endsWith(entry);
    }

    return normalizedEmail === entry;
  });
}

export function createAuth(env: Env) {
  return betterAuth({
    appName: "Cache",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    account: {
      encryptOAuthTokens: true,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!isApprovedEmail(user.email, env)) {
              throw new APIError("FORBIDDEN", {
                message: "This Google account is not approved for Cache.",
              });
            }

            return { data: user };
          },
        },
      },
    },
  });
}
