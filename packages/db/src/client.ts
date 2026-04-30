import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: postgres.Sql | undefined;
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

// In development, reuse the client to avoid exhausting connections
const sql = globalThis._pgClient ?? createClient();
if (process.env["NODE_ENV"] !== "production") {
  globalThis._pgClient = sql;
}

export const db = drizzle(sql, { schema });
export type Database = typeof db;
