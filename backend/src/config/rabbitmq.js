import amqplib from "amqplib";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { QUEUES } from "../queues/queues.js";

let connection;
let channel;

export async function getChannel() {
  if (channel) return channel;
  connection = await amqplib.connect(env.rabbitmqUrl);
  connection.on("error", (err) => {
    logger.error("RabbitMQ connection error", err.message);
    channel = null;
    connection = null;
  });
  connection.on("close", () => {
    logger.warn("RabbitMQ connection closed");
    channel = null;
    connection = null;
  });
  channel = await connection.createChannel();
  await channel.assertQueue(QUEUES.SCRAPE_JOBS, { durable: true });
  await channel.assertQueue(QUEUES.SCRAPE_POSTS, { durable: true });
  return channel;
}

export async function waitForRabbit(retries = 5) {
  for (let i = 1; i <= retries; i += 1) {
    try {
      await getChannel();
      logger.info("RabbitMQ connected");
      return;
    } catch (err) {
      logger.warn(`Waiting for RabbitMQ (${i}/${retries}): ${err.message}`);
      channel = null;
      connection = null;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("RabbitMQ did not become ready");
}
