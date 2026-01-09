import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { setupRoutes } from '../server/routes';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

let routesInitialized = false;

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (!routesInitialized) {
      console.log('[Vercel] Initializing routes...');

      // Check for critical env vars
      if (!process.env.DATABASE_URL) {
        console.error('[Vercel] CRITICAL: DATABASE_URL is missing!');
      }

      await setupRoutes(app);
      routesInitialized = true;
      console.log('[Vercel] Routes initialized');
    }

    return app(req, res);
  } catch (error: any) {
    console.error('[Vercel] Global Error Handler:', error);

    // Return a JSON error instead of letting Vercel show the generic error page
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      phase: routesInitialized ? 'runtime' : 'initialization'
    });
  }
};
