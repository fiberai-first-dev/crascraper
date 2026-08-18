import bcrypt from "bcryptjs";
import { env } from "../src/config/env.js";
import { pool } from "../src/config/database.js";
import { logger } from "../src/config/logger.js";

export async function seedIfNeeded() {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [env.seedEmail.toLowerCase()]);
  if (existing.rowCount) {
    logger.info("Demo user already present");
    return;
  }

  const passwordHash = await bcrypt.hash(env.seedPassword, 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)`,
    [env.seedEmail.toLowerCase(), passwordHash, env.seedName]
  );
  logger.info(`Seeded demo user ${env.seedEmail} (creator catalog stays empty until candidates qualify)`);
}

if (process.argv[1] && String(process.argv[1]).endsWith("seed.js")) {
  seedIfNeeded()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
