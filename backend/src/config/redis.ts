import Redis, { RedisOptions } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

function buildRedisOptions(): RedisOptions {
  if (process.env.REDIS_URL) {
    try {
      const parsed = new URL(process.env.REDIS_URL);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
        tls: parsed.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times: number) {
          return Math.min(times * 100, 3000);
        },
      };
    } catch (e) {
      console.warn('⚠️ Could not parse REDIS_URL, falling back to standard options');
    }
  }

  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD || undefined;

  return {
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      return Math.min(times * 100, 3000);
    },
  };
}

export const redisConnectionOptions = buildRedisOptions();
export const redisClient = new Redis(redisConnectionOptions);

redisClient.on('connect', () => {
  console.log(`✅ Redis connected at ${redisConnectionOptions.host}:${redisConnectionOptions.port}`);
});

redisClient.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

