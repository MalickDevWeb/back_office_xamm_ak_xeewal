import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function main() {
  await redis.del('rbac:modules:DEFAULT_ORG');
  console.log('Cleared redis cache for rbac:modules:DEFAULT_ORG');
}

main().catch(console.error);
