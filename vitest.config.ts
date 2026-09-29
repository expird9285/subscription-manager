import path from "node:path";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

import { TEST_DISCORD_PUBLIC_KEY } from "./test/fixtures";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.resolve("migrations"));

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            DISCORD_CLIENT_ID: "123456789012345678",
            DISCORD_CLIENT_SECRET: "test-client-secret",
            DISCORD_PUBLIC_KEY: TEST_DISCORD_PUBLIC_KEY,
            DISCORD_BOT_TOKEN: "test-bot-token",
            DISCORD_ALERT_CHANNEL_ID: "222222222222222222",
            ALLOWED_DISCORD_IDS: "111111111111111111, 333333333333333333",
          },
        },
      }),
    ],
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
    },
  };
});
