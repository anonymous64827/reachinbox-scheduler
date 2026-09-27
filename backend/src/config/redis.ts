import Redis, { RedisOptions } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

function buildRedisOptions(): RedisOptions {
  let rawUrl = process.env.REDIS_URL;
  if (rawUrl && typeof rawUrl === 'string') {
    rawUrl = rawUrl.trim();
    // Remove wrapping quotes if entered with quotes
    rawUrl = rawUrl.replace(/^["']+|["']+$/g, '');

    // If user copied redis-cli command or extra flags: redis-cli --tls -u redis://...
    if (rawUrl.includes('redis://') || rawUrl.includes('rediss://')) {
      const match = rawUrl.match(/(rediss?:\/\/[^\s"']+)/);
      if (match) {
        rawUrl = match[1];
      }
    }

    try {
      const parsed = new URL(rawUrl);
      const isUpstash = parsed.hostname.includes('upstash.io');
      const isTls = parsed.protocol === 'rediss:' || isUpstash;

      console.log(`🔌 Detected cloud Redis endpoint: ${parsed.hostname}:${parsed.port || 6379} (TLS: ${isTls})`);

      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
        tls: isTls ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times: number) {
          return Math.min(times * 100, 3000);
        },
      };
    } catch (e: any) {
      console.warn(`⚠️ Could not parse REDIS_URL (${rawUrl.slice(0, 25)}...):`, e.message);
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

