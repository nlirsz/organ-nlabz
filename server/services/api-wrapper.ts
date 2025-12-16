/**
 * SISTEMA DE WRAPPER PARA APIS COM TIMEOUT, RETRY E RATE LIMITING
 * 
 * Este sistema fornece wrappers padronizados para todas as APIs custosas,
 * integrando com o rate limiter e fornecendo funcionalidades avançadas.
 */

import { rateLimiter } from './rate-limiter.js';

// Tipos para configuração de APIs
export interface APICallConfig {
  name: string;
  timeout?: number;
  maxRetries?: number;
  priority?: 'low' | 'normal' | 'high';
  fallbackResponse?: any;
  costTracking?: boolean;
  validateResponse?: (response: any) => boolean;
}

export interface APIError extends Error {
  code?: string;
  status?: number;
  isRetriable?: boolean;
  apiName?: string;
  requestId?: string;
}

// Helper para criar erros de API padronizados
export function createAPIError(
  message: string,
  code?: string,
  status?: number,
  isRetriable: boolean = false,
  apiName?: string
): APIError {
  const error = new Error(message) as APIError;
  error.code = code;
  error.status = status;
  error.isRetriable = isRetriable;
  error.apiName = apiName;
  error.requestId = `${apiName || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return error;
}

/**
 * WRAPPER PRINCIPAL PARA GEMINI AI
 */
export class GeminiAPIWrapper {
  private static instance: GeminiAPIWrapper;

  static getInstance(): GeminiAPIWrapper {
    if (!GeminiAPIWrapper.instance) {
      GeminiAPIWrapper.instance = new GeminiAPIWrapper();
    }
    return GeminiAPIWrapper.instance;
  }

  async generateContent(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      timeout?: number;
      priority?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<any> {
    const config: APICallConfig = {
      name: 'gemini',
      timeout: options.timeout || 30000,
      priority: options.priority || 'normal',
      costTracking: true,
      validateResponse: (response) => {
        return response && response.response && response.response.text;
      }
    };

    console.log(`[GeminiWrapper] 🤖 Iniciando análise com Gemini (prioridade: ${config.priority})`);

    const geminiCall = async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw createAPIError(
          'GEMINI_API_KEY não configurada',
          'MISSING_API_KEY',
          401,
          false,
          'gemini'
        );
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: options.model || "gemini-1.5-flash",
        generationConfig: {
          temperature: options.temperature || 0.1,
          maxOutputTokens: options.maxTokens || 1000,
          responseMimeType: "application/json"
        }
      });

      try {
        console.log(`[GeminiWrapper] 📤 Enviando prompt (${prompt.length} chars)`);
        const result = await model.generateContent(prompt);
        const response = result.response;

        if (!response || !response.text()) {
          throw createAPIError(
            'Resposta vazia do Gemini AI',
            'EMPTY_RESPONSE',
            200,
            true,
            'gemini'
          );
        }

        const text = response.text();
        console.log(`[GeminiWrapper] 📥 Resposta recebida (${text.length} chars)`);

        return { response: { text: () => text }, usage: (result as any).usage };

      } catch (error: any) {
        // Classifica erros para retry logic
        if (error.message?.includes('API_KEY')) {
          throw createAPIError(
            'API Key do Gemini inválida',
            'INVALID_API_KEY',
            401,
            false,
            'gemini'
          );
        }

        if (error.message?.includes('QUOTA_EXCEEDED')) {
          throw createAPIError(
            'Quota do Gemini excedida',
            'QUOTA_EXCEEDED',
            429,
            true,
            'gemini'
          );
        }

        if (error.message?.includes('RATE_LIMIT')) {
          throw createAPIError(
            'Rate limit do Gemini atingido',
            'RATE_LIMIT',
            429,
            true,
            'gemini'
          );
        }

        // Erro genérico retriável
        throw createAPIError(
          error.message || 'Erro desconhecido no Gemini AI',
          'UNKNOWN_ERROR',
          500,
          true,
          'gemini'
        );
      }
    };

    return this.executeWithWrapper(geminiCall, config);
  }

  private async executeWithWrapper<T>(
    apiCall: () => Promise<T>,
    config: APICallConfig
  ): Promise<T> {
    try {
      // Executa através do rate limiter
      const result = await rateLimiter.executeWithRateLimit(
        config.name,
        apiCall,
        [],
        config.priority
      );

      // Valida resposta se configurado
      if (config.validateResponse && !config.validateResponse(result)) {
        throw createAPIError(
          'Resposta inválida da API',
          'INVALID_RESPONSE',
          200,
          true,
          config.name
        );
      }

      return result;

    } catch (error: any) {
      console.error(`[${config.name}Wrapper] ❌ Erro:`, error.message);

      // Se tem fallback configurado e erro não é crítico
      if (config.fallbackResponse && error.isRetriable !== false) {
        console.log(`[${config.name}Wrapper] 🔄 Usando resposta fallback`);
        return config.fallbackResponse;
      }

      throw error;
    }
  }
}

/**
 * WRAPPER PARA ANYCRAWL API
 */
export class AnyCrawlAPIWrapper {
  private static instance: AnyCrawlAPIWrapper;

  static getInstance(): AnyCrawlAPIWrapper {
    if (!AnyCrawlAPIWrapper.instance) {
      AnyCrawlAPIWrapper.instance = new AnyCrawlAPIWrapper();
    }
    return AnyCrawlAPIWrapper.instance;
  }

  async scrapeUrl(
    url: string,
    options: {
      extractMetadata?: boolean;
      screenshot?: boolean;
      waitFor?: string;
      timeout?: number;
      priority?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<any> {
    const config: APICallConfig = {
      name: 'anycrawl',
      timeout: options.timeout || 45000,
      priority: options.priority || 'normal',
      costTracking: true,
      validateResponse: (response) => {
        return response && response.success;
      }
    };

    console.log(`[AnyCrawlWrapper] 🕷️ Iniciando scraping: ${url} (prioridade: ${config.priority})`);

    const anyCrawlCall = async () => {
      const axios = (await import('axios')).default;

      const apiKey = process.env.ANYCRAWL_API_KEY;
      if (!apiKey) {
        throw createAPIError(
          'ANYCRAWL_API_KEY não configurada',
          'MISSING_API_KEY',
          401,
          false,
          'anycrawl'
        );
      }

      try {
        console.log(`[AnyCrawlWrapper] 📤 Enviando request para AnyCrawl`);
        console.log(`[AnyCrawlWrapper] 💰 ATENÇÃO: Esta operação consumirá créditos`);
        console.log(`[AnyCrawlWrapper] 🔑 API Key: ${apiKey.substring(0, 10)}...`);

        // Tenta múltiplos endpoints (v1 e v2)
        const endpoints = [
          'https://api.anycrawl.com/v2/crawl',
          'https://api.anycrawl.com/v1/crawl',
          'https://anycrawl.com/api/v1/crawl'
        ];

        let lastError: any;
        for (const endpoint of endpoints) {
          try {
            console.log(`[AnyCrawlWrapper] 🔗 Tentando endpoint: ${endpoint}`);

            const response = await axios.post(endpoint, {
              url: url,
              extract_metadata: options.extractMetadata !== false,
              screenshot: options.screenshot || false,
              wait_for: options.waitFor || 'networkidle',
              timeout: options.timeout || 30000
            }, {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: config.timeout,
              validateStatus: (status) => status < 500
            });

            const result = response.data;

            if (!result.success && !result.data) {
              console.log(`[AnyCrawlWrapper] ⚠️ Endpoint ${endpoint} retornou erro, tentando próximo...`);
              lastError = new Error(result.error || 'Falha no scraping');
              continue;
            }

            console.log(`[AnyCrawlWrapper] ✅ Scraping concluído com ${endpoint}`);
            console.log(`[AnyCrawlWrapper] 💰 Créditos usados: ${result.credits_used || 'N/A'}`);

            return result;

          } catch (endpointError: any) {
            lastError = endpointError;
            console.log(`[AnyCrawlWrapper] ⚠️ Falha em ${endpoint}: ${endpointError.message}`);
            continue;
          }
        }

        // Se chegou aqui, todos os endpoints falharam
        throw lastError || new Error('Todos os endpoints AnyCrawl falharam');

      } catch (error: any) {
        if (error.response?.status === 402) {
          throw createAPIError(
            'Créditos AnyCrawl insuficientes',
            'INSUFFICIENT_CREDITS',
            402,
            false,
            'anycrawl'
          );
        }

        if (error.response?.status === 401) {
          throw createAPIError(
            'API Key AnyCrawl inválida',
            'INVALID_API_KEY',
            401,
            false,
            'anycrawl'
          );
        }

        if (error.response?.status === 429) {
          throw createAPIError(
            'Rate limit AnyCrawl atingido',
            'RATE_LIMIT',
            429,
            true,
            'anycrawl'
          );
        }

        // Network errors são retriáveis
        if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'TIMEOUT') {
          throw createAPIError(
            `Erro de rede: ${error.message}`,
            error.code,
            500,
            true,
            'anycrawl'
          );
        }

        throw createAPIError(
          error.message || 'Erro desconhecido no AnyCrawl',
          'UNKNOWN_ERROR',
          500,
          true,
          'anycrawl'
        );
      }
    };

    return this.executeWithWrapper(anyCrawlCall, config);
  }

  private async executeWithWrapper<T>(
    apiCall: () => Promise<T>,
    config: APICallConfig
  ): Promise<T> {
    try {
      return await rateLimiter.executeWithRateLimit(
        config.name,
        apiCall,
        [],
        config.priority
      );
    } catch (error: any) {
      console.error(`[${config.name}Wrapper] ❌ Erro:`, error.message);
      throw error;
    }
  }
}

/**
 * WRAPPER PARA PLAYWRIGHT (SCRAPING BROWSER)
 */
export class PlaywrightAPIWrapper {
  private static instance: PlaywrightAPIWrapper;

  static getInstance(): PlaywrightAPIWrapper {
    if (!PlaywrightAPIWrapper.instance) {
      PlaywrightAPIWrapper.instance = new PlaywrightAPIWrapper();
    }
    return PlaywrightAPIWrapper.instance;
  }

  async scrapeUrl(
    url: string,
    options: {
      waitForSelector?: string;
      timeout?: number;
      screenshot?: boolean;
      priority?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<{ html: string; screenshot?: Buffer }> {
    const config: APICallConfig = {
      name: 'playwright',
      timeout: options.timeout || 30000,
      priority: options.priority || 'normal',
      costTracking: false, // Não tem custo monetário direto
      validateResponse: (response) => {
        return response && response.html && response.html.length > 100;
      }
    };

    console.log(`[PlaywrightWrapper] 🎭 Iniciando browser scraping: ${url} (prioridade: ${config.priority})`);

    const playwrightCall = async () => {
      const { chromium } = await import('playwright');

      let browser;
      try {
        browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-gpu'
          ]
        });

        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          viewport: { width: 1366, height: 768 },
          locale: 'pt-BR',
          ignoreHTTPSErrors: true
        });

        const page = await context.newPage();

        // Bloqueia recursos desnecessários para economizar recursos
        await page.route('**/*', (route) => {
          const resourceType = route.request().resourceType();
          if (['image', 'stylesheet', 'font', 'media', 'websocket'].includes(resourceType)) {
            route.abort();
          } else {
            route.continue();
          }
        });

        console.log(`[PlaywrightWrapper] 🌐 Navegando para: ${url}`);
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: config.timeout
        });

        // Aguarda conteúdo dinâmico carregar
        await page.waitForTimeout(3000);

        // Aguarda seletor específico se fornecido
        if (options.waitForSelector) {
          try {
            await page.waitForSelector(options.waitForSelector, { timeout: 5000 });
          } catch (e) {
            console.log(`[PlaywrightWrapper] ⚠️ Seletor ${options.waitForSelector} não encontrado, continuando...`);
          }
        }

        const html = await page.content();
        let screenshot: Buffer | undefined;

        if (options.screenshot) {
          screenshot = await page.screenshot({ fullPage: false });
        }

        console.log(`[PlaywrightWrapper] ✅ HTML capturado: ${Math.round(html.length / 1000)}KB`);

        return { html, screenshot };

      } finally {
        if (browser) {
          await browser.close();
        }
      }
    };

    return this.executeWithWrapper(playwrightCall, config);
  }

  private async executeWithWrapper<T>(
    apiCall: () => Promise<T>,
    config: APICallConfig
  ): Promise<T> {
    try {
      return await rateLimiter.executeWithRateLimit(
        config.name,
        apiCall,
        [],
        config.priority
      );
    } catch (error: any) {
      console.error(`[${config.name}Wrapper] ❌ Erro:`, error.message);

      // Para Playwright, fornece fallback básico
      if (config.name === 'playwright') {
        throw createAPIError(
          `Erro no browser scraping: ${error.message}`,
          'PLAYWRIGHT_ERROR',
          500,
          true,
          'playwright'
        );
      }

      throw error;
    }
  }
}

/**
 * FACTORY PARA OBTER WRAPPERS
 */
export class APIWrapperFactory {
  static getGeminiWrapper(): GeminiAPIWrapper {
    return GeminiAPIWrapper.getInstance();
  }

  static getAnyCrawlWrapper(): AnyCrawlAPIWrapper {
    return AnyCrawlAPIWrapper.getInstance();
  }

  static getPlaywrightWrapper(): PlaywrightAPIWrapper {
    return PlaywrightAPIWrapper.getInstance();
  }

  // Método para verificar saúde de todas as APIs
  static async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    // Verifica Gemini
    try {
      health.gemini = !!process.env.GEMINI_API_KEY;
    } catch {
      health.gemini = false;
    }

    // Verifica AnyCrawl
    try {
      health.anycrawl = !!process.env.ANYCRAWL_API_KEY;
    } catch {
      health.anycrawl = false;
    }

    // Playwright está sempre disponível (local)
    health.playwright = true;

    return health;
  }

  // Método para obter estatísticas de todas as APIs
  static getStats(): Record<string, any> {
    return rateLimiter.getStats() as Record<string, any>;
  }

  // Método para obter custo total
  static getTotalCost(): number {
    return rateLimiter.getTotalCost();
  }
}

// Exporta instâncias prontas para uso
export const geminiWrapper = APIWrapperFactory.getGeminiWrapper();
export const anyCrawlWrapper = APIWrapperFactory.getAnyCrawlWrapper();
export const playwrightWrapper = APIWrapperFactory.getPlaywrightWrapper();

console.log('[APIWrapper] 🔧 API Wrappers inicializados');