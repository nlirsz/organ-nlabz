import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
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
        if (!global.healthCheckCount) global.healthCheckCount = 0;
        global.healthCheckCount++;
        if (global.healthCheckCount % 30 === 0) {
          log(`[Health Check] HEAD /api 200 (logged every 30 requests, count: ${global.healthCheckCount})`);
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

// Initialize storage with fallback support
async function initializeStorage(): Promise<boolean> {
  try {
    log('🔄 Initializing storage system...');
    
    // Test storage initialization using the new dynamic system
    const storage = await getStorage();
    
    // Test storage with a simple operation
    await storage.getUser(1);
    
    log('✅ Storage system initialized successfully');
    return true;
  } catch (error: any) {
    log(`❌ Storage initialization failed: ${error.message}`);
    return false;
  }
}

(async () => {
  // Inicializar aplicação
  console.log("🚀 Iniciando aplicação...");
  
  // Initialize storage with fallback support (no DATABASE_URL required in development)
  log('🔄 Initializing storage system with fallback support...');
  const storageInitialized = await initializeStorage();
  
  if (!storageInitialized) {
    if (process.env.NODE_ENV === 'production') {
      log('❌ Falha crítica na inicialização do storage em produção');
      log('🔧 Possíveis soluções:');
      log('  1. Habilite o endpoint Neon no dashboard');
      log('  2. Verifique DATABASE_URL no painel de Deployments'); 
      log('  3. Aguarde alguns minutos para o banco "acordar"');
      
      // Em produção, continua em modo degradado
      log('⚠️  Iniciando em modo degradado - funcionalidade limitada');
      
      // Adiciona rota especial para erro de banco
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(503).json({
            error: 'STORAGE_UNAVAILABLE',
            message: 'Sistema de armazenamento temporariamente indisponível',
            suggestions: [
              'Habilite o endpoint Neon no dashboard',
              'Verifique a configuração DATABASE_URL',
              'Aguarde alguns minutos e recarregue a página'
            ]
          });
        }
        // Para outras rotas, envia página de manutenção
        res.status(503).send(`
          <html><body style="font-family:Arial,sans-serif;text-align:center;padding:50px;">
            <h1>⚠️ Serviço Temporariamente Indisponível</h1>
            <p>O sistema de armazenamento está temporariamente indisponível.</p>
            <p>Possíveis soluções:</p>
            <ul style="text-align:left;display:inline-block;">
              <li>Habilite o endpoint Neon no dashboard</li>
              <li>Verifique a configuração DATABASE_URL</li>
              <li>Aguarde alguns minutos e recarregue a página</li>
            </ul>
            <button onclick="location.reload()" style="padding:10px 20px;margin-top:20px;">Tentar Novamente</button>
          </body></html>
        `);
      });
      
      // Pula inicialização normal em caso de erro de storage
      const server = createServer(app);
      server.listen({ port: 5000, host: "0.0.0.0" }, () => {
        log(`⚠️  Servidor rodando em modo degradado na porta 5000`);
      });
      return;
    } else {
      log('❌ Falha crítica na inicialização do storage em desenvolvimento');
      process.exit(1);
    }
  }

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