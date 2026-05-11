import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var _drizzleDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function createClient() {
  const url = process.env["DATABASE_URL_POOLING"] ?? process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set");

  return postgres(url, {
    max: 1, // connection pool of 1 for serverless
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

function getDb() {
  if (!globalThis._drizzleDb) {
    const sql = globalThis._pgClient ?? createClient();
    if (process.env["NODE_ENV"] !== "production") {
      globalThis._pgClient = sql;
    }
    globalThis._drizzleDb = drizzle(sql, { schema });
  }
  return globalThis._drizzleDb;
}

// Lazy proxy: defers DB client construction until first property access.
// This lets Next.js collect page data during build without DATABASE_URL.
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});

export type Database = ReturnType<typeof drizzle<typeof schema>>;
