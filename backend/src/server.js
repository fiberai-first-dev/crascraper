import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { pool, waitForDatabase } from "./config/database.js";
import { waitForRabbit } from "./config/rabbitmq.js";
import { createApp } from "./app.js";
import { seedIfNeeded } from "../seeds/seed.js";
import { queueSeedDiscovery } from "./services/discovery.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const dir = path.join(__dirname, "../migrations");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  for (const file of files) {
    const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
    if (applied.rowCount) continue;
    const sql = await fs.readFile(path.join(dir, file), "utf8");
    logger.info(`Applying migration ${file}`);
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
  }
}

async function start() {
  await waitForDatabase();
  await runMigrations();
  await seedIfNeeded();

  if (env.rabbitmqUrl) {
    try {
      await waitForRabbit();
      await queueSeedDiscovery();
    } catch (err) {
      logger.warn(`RabbitMQ unavailable, search still works against PostgreSQL: ${err.message}`);
    }
  } else {
    logger.info("Collection disabled; API will serve the existing catalog");
  }

  const app = createApp();
  const server = http.createServer(app);
  server.listen(env.port, "0.0.0.0", () => {
    logger.info(`API listening on :${env.port}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  logger.error(err);
  process.exit(1);
});
