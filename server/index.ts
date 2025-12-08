import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import dns from "dns";

// Force IPv4 for all DNS lookups to avoid IPv6 connection issues
// This fixes the "connect ETIMEDOUT ...:838:6e0b..." error seen in logs
const originalLookup = dns.lookup;
(dns as any).lookup = (hostname: string, options: any, callback: any) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  options.family = 4; // Force IPv4
  return originalLookup(hostname, options, callback);
};
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { getStorage } from "./storage";

const app = express();
// Aumenta limite para suportar imagens base64 (max 10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Security utility functions for logging
function shouldLogResponse(path: string): boolean {
  // Don't log responses for auth endpoints to prevent token exposure
  const sensitiveEndpoints = ['/api/auth/login', '/api/auth/register'];
  return !sensitiveEndpoints.some(endpoint => path.includes(endpoint));
}

function filterSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = ['token', 'password', 'jwt', 'secret', 'key', 'authorization'];
  const filtered = { ...data };

  // Filter sensitive fields
  for (const field of sensitiveFields) {
    if (filtered[field]) {
      filtered[field] = '[FILTERED]';
    }
  }

  // Recursively filter nested objects
  for (const key in filtered) {
    if (typeof filtered[key] === 'object' && filtered[key] !== null) {
      filtered[key] = filterSensitiveData(filtered[key]);
    }
  }

  return filtered;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Skip logging for frequent health checks to reduce log pollution
      if (path === "/api" && req.method === "HEAD") {
        // Only log health checks occasionally (every 30th request) to confirm they're working
        if (!(global as any).healthCheckCount) (global as any).healthCheckCount = 0;
        (global as any).healthCheckCount++;
        if ((global as any).healthCheckCount % 30 === 0) {
          log(`[Health Check] HEAD /api 200 (logged every 30 requests, count: ${(global as any).healthCheckCount})`);
        }
        return; // Skip detailed logging for HEAD /api
      }

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      // Filter sensitive data from API response logs
      if (capturedJsonResponse && shouldLogResponse(path)) {
        const filteredResponse = filterSensitiveData(capturedJsonResponse);
        logLine += ` :: ${JSON.stringify(filteredResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});


(async () => {
  // Inicializar aplicação
  console.log("🚀 Iniciando aplicação...");


  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000, vite serves on 5173
  const PORT = 5000;
  server.listen({
    port: PORT,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`✅ Servidor rodando na porta ${PORT}`);
  });
})();