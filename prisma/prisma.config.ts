import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./schema.prisma",
  migrations: {
    path: "./migrations",
    seed: "node ./seed.mjs",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

