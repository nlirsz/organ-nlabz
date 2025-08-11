import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

// Configuração de conexão com retry e timeout
const sql = neon(process.env.DATABASE_URL, {
  // Configurações de conexão
  connectionTimeoutMillis: 60000, // 60 segundos
  idleTimeoutMillis: 60000, // 60 segundos de idle
  maxUses: 50, // Reduzido para evitar problemas de pool
  poolQueryViaFetch: true, // Força uso via fetch
  
  // Configurações de fetch para melhor compatibilidade
  fetchOptions: {
    cache: 'no-store',
    keepalive: false
  }
});

export const db = drizzle(sql, {
  logger: process.env.NODE_ENV === 'development'
});

// Função para testar a conexão com wake-up automático
export async function testConnection() {
  try {
    // Primeira tentativa
    await sql`SELECT 1 as test`;
    console.log("✅ Conectado ao PostgreSQL com sucesso!");
    return true;
  } catch (error: any) {
    console.warn("⚠️ Primeira tentativa falhou, tentando acordar o banco:", error.message);
    
    // Se for erro de endpoint desabilitado, tenta acordar o banco
    if (error.message?.includes('endpoint has been disabled') || 
        error.message?.includes('terminating connection')) {
      
      console.log("🔄 Tentando acordar o banco de dados...");
      
      // Aguarda um pouco e tenta novamente
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        await sql`SELECT 1 as test`;
        console.log("✅ Banco acordado! Conectado ao PostgreSQL com sucesso!");
        return true;
      } catch (retryError) {
        console.error("❌ Falha ao acordar o banco:", retryError);
        return false;
      }
    }
    
    console.error("❌ Erro ao conectar com PostgreSQL:", error);
    return false;
  }
}

// Wrapper para queries com retry automático
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Se for erro de conexão, tenta reconectar
      if (
        error instanceof Error && 
        (error.message.includes('terminating connection') ||
         error.message.includes('connection') ||
         error.message.includes('timeout'))
      ) {
        console.warn(`⚠️ Erro de conexão (tentativa ${attempt}/${maxRetries}):`, error.message);

        if (attempt < maxRetries) {
          console.log(`🔄 Tentando novamente em ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
          continue;
        }
      }

      // Se não for erro de conexão ou se esgotaram as tentativas, relança o erro
      throw error;
    }
  }

  throw lastError!;
}