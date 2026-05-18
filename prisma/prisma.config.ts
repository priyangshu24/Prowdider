import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./schema.prisma",
  migrations: {
    path: "./migrations",
    seed: "node ./seed.mjs",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

