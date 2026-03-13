import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@hiveclip/db";

let sql: ReturnType<typeof postgres> | null = null;

export function createDb(url: string) {
  sql = postgres(url);
  const db = drizzle(sql, { schema });
  return { db, sql };
}

export async function stopDb() {
  if (sql) await sql.end();
}

export { schema };
