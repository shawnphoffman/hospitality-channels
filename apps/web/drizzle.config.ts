import type { Config } from "drizzle-kit";
import { PATHS } from "@hospitality-channels/common";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:${PATHS.database}`,
  },
} satisfies Config;
