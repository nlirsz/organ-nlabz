import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from "@shared/schema";


import dns from 'dns/promises';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

// Robustly handle IPv6 connection issues by resolving to IPv4 explicitly
// AND using port 6543 for the connection pooler.
const dbUrl = new URL(process.env.DATABASE_URL.replace(/\[|\]/g, ''));
dbUrl.port = '6543'; // Force Supavisor pooler port

try {
  const { address } = await dns.lookup(dbUrl.hostname, { family: 4 });
  console.log(`[DB] Resolved ${dbUrl.hostname} to ${address}`);
  dbUrl.hostname = address;
} catch (e) {
  console.error('[DB] Failed to resolve hostname to IPv4:', e);
  // Fallback to original hostname if resolution fails
}

const pool = new pg.Pool({
  connectionString: dbUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

// Disable prepare for compatibility with connection poolers
export const db = drizzle(pool, { schema, logger: true });

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