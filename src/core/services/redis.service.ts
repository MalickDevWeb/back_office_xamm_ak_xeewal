import { Redis } from '@upstash/redis';
import { config } from '@/core/lib/env';

// Singleton : crée l'instance Redis une seule fois
let redisInstance: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!config.upstashRedisUrl || !config.upstashRedisToken) {
    // Redis non configuré, le cache est désactivé silencieusement
    return null;
  }

  if (!redisInstance) {
    redisInstance = new Redis({
      url: config.upstashRedisUrl,
      token: config.upstashRedisToken,
    });
  }

  return redisInstance;
}

export const RedisService = {
  /**
   * Lit une valeur depuis le cache.
   * Retourne null si la clé n'existe pas ou si Redis est indisponible.
   */
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
      const data = await client.get<T>(key);
      if (data !== null) {
        console.log(`[Cache HIT] Clé: ${key}`);
      } else {
        console.log(`[Cache MISS] Clé: ${key}`);
      }
      return data;
    } catch (error) {
      console.error(`[Redis] Erreur lors de la lecture (${key}):`, error);
      return null; // Fail silently : on revient sur la BDD
    }
  },

  /**
   * Stocke une valeur dans le cache avec un TTL optionnel (en secondes).
   * Par défaut : 1 heure (3600s).
   */
  async set(key: string, value: unknown, ttlInSeconds: number = 3600): Promise<void> {
    const client = getRedisClient();
    if (!client) return;

    try {
      await client.set(key, value, { ex: ttlInSeconds });
      console.log(`[Cache SET] Clé: ${key} (TTL: ${ttlInSeconds}s)`);
    } catch (error) {
      console.error(`[Redis] Erreur lors de l'écriture (${key}):`, error);
    }
  },

  /**
   * Supprime une clé du cache (utile après un UPDATE ou DELETE).
   */
  async delete(key: string): Promise<void> {
    const client = getRedisClient();
    if (!client) return;

    try {
      await client.del(key);
      console.log(`[Cache DELETE] Clé: ${key}`);
    } catch (error) {
      console.error(`[Redis] Erreur lors de la suppression (${key}):`, error);
    }
  },

  /**
   * Supprime toutes les clés commençant par un préfixe donné.
   * Utile pour invalider un groupe de caches (ex: "rbac:*").
   */
  async invalidateByPrefix(prefix: string): Promise<void> {
    const client = getRedisClient();
    if (!client) return;

    try {
      const keys = await client.keys(`${prefix}*`);
      if (keys.length > 0) {
        await client.del(...keys);
        console.log(`[Cache INVALIDATE] ${keys.length} clé(s) supprimée(s) pour le préfixe: ${prefix}`);
      }
    } catch (error) {
      console.error(`[Redis] Erreur lors de l'invalidation (${prefix}):`, error);
    }
  },
};
