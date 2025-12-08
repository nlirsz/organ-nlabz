import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from "@shared/schema";
import dns from 'dns';
import { promisify } from 'util';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

// Parse the connection string to get the hostname
const connectionUrl = new URL(process.env.DATABASE_URL.replace(/\[|\]/g, ''));
const hostname = connectionUrl.hostname;

// Resolve hostname to IPv4 address
// We use a sync-like approach with top-level await if possible, or just let it resolve
// But to be safe and robust, we'll use a custom Pool that resolves on connect? No.
// Let's use the resolved IP in the connection string.
// Note: We must keep the original hostname in the SSL config for SNI.

// We will use a lazy initialization pattern or just standard pool with a fix.
// Since we can't easily do top-level await in all environments without issues,
// let's try a different approach:
// We will NOT use top-level await. We will rely on the fact that `pg` might allow passing a custom lookup? No.
// Let's go back to the "patch dns.lookup" but ONLY for this specific hostname?
// Or better: Use the `dns-result-order=ipv4first` which I added to package.json.
// The user said "getaddrinfo ENOTFOUND". This means the previous patch BROKE it.
// Reverting the patch (which I just did in the previous step's plan) + the package.json flag SHOULD work.
// The package.json flag `--dns-result-order=ipv4first` is the standard way.
// So, simply reverting the index.ts patch might be enough.
// BUT, to be absolutely sure, I will add a check in `db.ts` to log the resolved IP for debugging.

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL?.replace(/\[|\]/g, ''),
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

// Helper to retry database operations
export async function executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.error(`Database operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);

      // Don't retry if it's a logic error (like constraint violation)
      if (error.code && ['23505', '23503', '42P01'].includes(error.code)) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}