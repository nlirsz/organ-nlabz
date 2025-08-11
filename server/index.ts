import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { users } from "@shared/schema";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Database connection retry utility with exponential backoff
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function initializeDatabase(maxRetries: number = 5): Promise<boolean> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Test the database connection with a simple query
      await db.select().from(users).limit(1);
      log('✅ Conectado ao PostgreSQL com sucesso!');
      return true;
    } catch (error: any) {
      retries++;
      const isLastAttempt = retries === maxRetries;
      
      // Log the specific error for debugging
      if (error.message?.includes('endpoint has been disabled')) {
        log(`❌ [Tentativa ${retries}/${maxRetries}] Neon database endpoint está desabilitado`);
        if (isLastAttempt) {
          log('🔧 Possíveis soluções:');
          log('  1. Habilite o endpoint no painel Neon dashboard');
          log('  2. Verifique se DATABASE_URL está configurado corretamente');
          log('  3. Aguarde alguns minutos e tente novamente');
        }
      } else {
        log(`❌ [Tentativa ${retries}/${maxRetries}] Erro ao conectar com PostgreSQL:`, error.message);
      }
      
      if (isLastAttempt) {
        log('❌ Esgotadas todas as tentativas de conexão com o banco');
        return false;
      }
      
      // Exponential backoff: 2^retries * 1000ms (1s, 2s, 4s, 8s, 16s)
      const delayMs = Math.pow(2, retries) * 1000;
      log(`⏳ Aguardando ${delayMs/1000}s antes da próxima tentativa...`);
      await sleep(delayMs);
    }
  }
  
  return false;
}

(async () => {
  // Inicializar aplicação
  console.log("🚀 Iniciando aplicação...");
  
  // Verificar variáveis de ambiente críticas
  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL não encontrado nas variáveis de ambiente');
    log('🔧 Configure DATABASE_URL no painel de Deployments');
    process.exit(1);
  }
  
  log('🔍 Tentando conectar ao banco de dados...');
  const dbConnected = await initializeDatabase();
  
  if (!dbConnected) {
    log('❌ Falha na inicialização do banco de dados');
    log('🔧 Possíveis soluções:');
    log('  1. Habilite o endpoint Neon no dashboard');
    log('  2. Verifique DATABASE_URL no painel de Deployments'); 
    log('  3. Aguarde alguns minutos para o banco "acordar"');
    
    // Em produção, continua em modo degradado
    if (process.env.NODE_ENV === 'production') {
      log('⚠️  Iniciando em modo degradado - funcionalidade limitada');
      
      // Adiciona rota especial para erro de banco
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(503).json({
            error: 'DATABASE_UNAVAILABLE',
            message: 'Banco de dados temporariamente indisponível',
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
            <p>O banco de dados está temporariamente indisponível.</p>
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
      
      // Pula inicialização normal em caso de erro de DB
      const server = createServer(app);
      server.listen({ port: 5000, host: "0.0.0.0" }, () => {
        log(`⚠️  Servidor rodando em modo degradado na porta 5000`);
      });
      return;
    } else {
      log('❌ Saindo em ambiente de desenvolvimento');
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