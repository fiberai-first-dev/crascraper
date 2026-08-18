import { getChannel } from "../config/rabbitmq.js";
import { logger } from "../config/logger.js";
import { QUEUES } from "./queues.js";

export async function publishJson(queue, payload) {
  const ch = await getChannel();
  ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: "application/json",
  });
}

export async function publishScrapeJob(payload) {
  try {
    await publishJson(QUEUES.SCRAPE_JOBS, payload);
  } catch (err) {
    logger.error("Failed to publish scrape job", err.message);
    throw err;
  }
}
