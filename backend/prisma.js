require("dotenv").config();

const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

if (localOnly) {
  const errorMessage =
    "Prisma/Neon is disabled because DATABASE_MODE=local or DATABASE_URL is not set.";

  module.exports = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "$disconnect") return async () => {};
        if (prop === "$connect") return async () => {};
        throw new Error(errorMessage);
      },
    }
  );
} else {
  const { PrismaClient } = require("@prisma/client");
  const { Pool } = require("pg");
  const { PrismaPg } = require("@prisma/adapter-pg");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);

  const prisma = new PrismaClient({
    adapter,
  });

  module.exports = prisma;
}
