import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

// Clean the connection string (remove brackets if any and handle potential whitespace)
const connectionString = process.env.DATABASE_URL.replace(/\[|\]/g, '').trim();
console.log('[DB] Connecting to database...');

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10, // Limit connections in serverless
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
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