import dotenv from "dotenv";

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databaseUrl: required("DATABASE_URL", "postgres://crafter:crafter@localhost:5432/crafter"),
  rabbitmqUrl: required("RABBITMQ_URL", "amqp://crafter:crafter@localhost:5672"),
  jwtSecret: required("JWT_SECRET", "dev-jwt-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:8081,http://localhost:8080,http://localhost:5173,http://insta-demo.fybud.com,https://insta-demo.fybud.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  staleAfterHours: Number(process.env.STALE_AFTER_HOURS || 168),
  maxRefreshJobsPerSearch: Number(process.env.MAX_REFRESH_JOBS_PER_SEARCH || 20),
  seedEmail: process.env.SEED_EMAIL || "agency@fiberai.com",
  seedPassword: process.env.SEED_PASSWORD || "password123",
  seedName: process.env.SEED_NAME || "Fiber Agency",
};
