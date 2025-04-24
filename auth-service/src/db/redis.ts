import Redis from "ioredis";

export const redis = new Redis({
  host: process.env.REDIS_HOST, 
  port: Number(process.env.REDIS_PORT), 
  password: process.env.REDIS_PASSWORD, 
  tls: {}, // 👈 REQUIRED for Redis Cloud (uses TLS/SSL)
});

redis.on('connect', () => {
  console.log('[Redis] Connected!');
});
redis.on('ready', () => {
  console.log('[Redis] Ready to use');
});
redis.on('error', (err) => {
  console.error('[Redis] Error:', err);
});
// export default redis