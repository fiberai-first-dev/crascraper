import pg from "pg";
import { env } from "./env.js";
import { logger } from "./logger.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 15,
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function waitForDatabase(retries = 40) {
  for (let i = 1; i <= retries; i += 1) {
    try {
      await pool.query("SELECT 1");
      logger.info("PostgreSQL connected");
      return;
    } catch (err) {
      logger.warn(`Waiting for PostgreSQL (${i}/${retries}): ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("PostgreSQL did not become ready");
}
