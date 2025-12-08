import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { scrapeProductFromUrl } from "./services/scraper.js";
import { priceHistoryService } from "./services/priceHistory.js";
import { notificationService } from "./services/notifications.js";
import { insertProductSchema, updateProductSchema } from "@shared/schema.js";
import { z } from "zod";
import { storage, getStorage } from "./storage";
import { generateToken, generateTokenPair, verifyRefreshToken, authenticateToken, type AuthenticatedRequest } from "./middleware/auth";
import bcrypt from "bcryptjs";
import { anyCrawlService } from "./services/anycrawl.js";
import { rateLimiter } from "./services/rate-limiter.js";
import { APIWrapperFactory } from "./services/api-wrapper.js";

// Type-safe wrapper for authenticated routes that properly handles Express compatibility
const withAuth = <T = any>(
  handler: (req: Request, res: Response, next?: NextFunction) => Promise<T> | T
): express.RequestHandler => {
  return handler;
};

// Rate limiting middleware for scraping endpoints
const rateLimitScraping = async (req: any, res: any, next: any) => {
  try {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    console.log(`[RateLimitMiddleware] Scraping request from ${ip} (${userAgent})`);

    // Check if system is in emergency mode
    if (rateLimiter.isEmergencyActive()) {
      return res.status(503).json({
        error: 'Sistema temporariamente em modo emergência',
        message: 'Scraping indisponível devido a controles de custo',
        retryAfter: 300 // 5 minutes
      });
    }

    // Get current stats
    const stats = rateLimiter.getStats() as Record<string, any>;
    const queueStatus = rateLimiter.getQueueStatus();

    // Check if critical APIs are down
    const criticalApisDown = Object.values(stats).some((stat: any) => stat.circuitState === 'open');
    if (criticalApisDown) {
      return res.status(503).json({
        error: 'Serviços de scraping temporariamente indisponíveis',
        message: 'Algumas APIs estão com problemas, tente novamente em alguns minutos',
        retryAfter: 60
      });
    }

    // Check queue lengths
    const totalQueueLength = Object.values(queueStatus).reduce((sum: number, length: number) => sum + length, 0);
    if (totalQueueLength > 10) {
      return res.status(429).json({
        error: 'Sistema sobrecarregado',
        message: `${totalQueueLength} requests na fila. Tente novamente em alguns minutos.`,
        queuePosition: totalQueueLength + 1,
        retryAfter: Math.min(totalQueueLength * 10, 300) // Max 5 minutes
      });
    }

    // Add rate limit info to response headers
    res.set({
      'X-RateLimit-TotalCost': rateLimiter.getTotalCost().toFixed(4),
      'X-RateLimit-Queue-Length': totalQueueLength.toString(),
      'X-RateLimit-Emergency-Mode': rateLimiter.isEmergencyActive() ? 'true' : 'false'
    });

    next();
  } catch (error) {
    console.error('[RateLimitMiddleware] Error:', error);
    next(); // Continue on middleware errors
  }
};

export async function registerRoutes(app: Express): Promise<Server> {

  // Enhanced health check with rate limiting information
  app.get("/api/health", async (req, res) => {
    try {
      // Test storage connection
      const storageInstance = await getStorage();
      await storage.getUser(1);

      // Determine storage type
      const isMemStorage = process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL;
      const storageType = isMemStorage ? 'MemStorage' : 'PostgreSQL';

      // Get rate limiting statistics
      const rateLimitStats = rateLimiter.getStats() as Record<string, any>;
      const totalCost = rateLimiter.getTotalCost();
      const queueStatus = rateLimiter.getQueueStatus();
      const apiHealth = await APIWrapperFactory.healthCheck();

      // Check if any APIs are in circuit breaker state
      const hasOpenCircuits = Object.values(rateLimitStats).some((stat: any) => stat.circuitState === 'open');

      const healthData = {
        status: hasOpenCircuits ? "degraded" : "healthy",
        storage: storageType,
        database: isMemStorage ? "n/a" : "connected",
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        rateLimiting: {
          totalCostToday: `$${totalCost.toFixed(4)}`,
          apisHealth: apiHealth,
          stats: rateLimitStats,
          queueStatus: queueStatus,
          emergencyMode: rateLimiter.isEmergencyActive() || false
        }
      };

      res.status(hasOpenCircuits ? 503 : 200).json(healthData);
    } catch (error: any) {
      res.status(503).json({
        status: "unhealthy",
        storage: "unknown",
        database: "disconnected",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Storage connection middleware for protected routes
  const requireDatabase = async (req: any, res: any, next: any) => {
    try {
      // Quick storage test - works for both DatabaseStorage and MemStorage
      await storage.getUser(1);
      next();
    } catch (error: any) {
      const isMemStorage = process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL;

      // If we're using MemStorage in development, this shouldn't fail
      if (isMemStorage) {
        console.warn('⚠️ Storage test failed unexpectedly in MemStorage mode:', error.message);
        // Continue anyway in MemStorage mode
        return next();
      }

      console.error("Database connection failed:", error.message);

      if (error.message?.includes('endpoint has been disabled')) {
        return res.status(503).json({
          message: "Banco de dados temporariamente indisponível. O endpoint Neon precisa ser habilitado.",
          error: "DATABASE_ENDPOINT_DISABLED",
          suggestions: [
            "Habilite o endpoint no painel Neon dashboard",
            "Verifique se DATABASE_URL está configurado corretamente",
            "Aguarde alguns minutos e tente novamente"
          ]
        });
      }

      return res.status(503).json({
        message: "Serviço temporariamente indisponível. Problemas de conexão com banco de dados.",
        error: "DATABASE_CONNECTION_FAILED",
        details: error.message // Exposed for debugging
      });
    }
  };

  // Auth Routes
  app.post("/api/auth/register", requireDatabase, async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres.' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: 'Usuário já existe.' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const user = await storage.createUser({ username, password: hashedPassword });

      // Generate token pair
      const tokenPair = generateTokenPair(user.id.toString());

      res.status(201).json({
        message: 'Usuário registrado com sucesso!',
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        userId: user.id.toString(),
        username: user.username
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: 'Erro interno do servidor ao registrar usuário.' });
    }
  });

  app.post("/api/auth/login", requireDatabase, async (req, res) => {
    try {
      console.log("[LOGIN] Tentativa de login para:", req.body.username);
      const { username, password } = req.body;

      if (!username || !password) {
        console.log("[LOGIN] Dados faltando - username:", !!username, "password:", !!password);
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
      }

      // Find user
      console.log("[LOGIN] Buscando usuário:", username);
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log("[LOGIN] Usuário não encontrado:", username);
        return res.status(401).json({ message: 'Credenciais inválidas (usuário não encontrado).' });
      }

      // Check password
      console.log("[LOGIN] Verificando senha para usuário:", user.id);
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log("[LOGIN] Senha incorreta para usuário:", user.id);
        return res.status(401).json({ message: 'Credenciais inválidas (senha incorreta).' });
      }

      // Generate token pair
      console.log("[LOGIN] Gerando tokens para usuário:", user.id);
      const tokenPair = generateTokenPair(user.id.toString());

      console.log("[LOGIN] Login bem-sucedido para usuário:", user.username);
      res.status(200).json({
        message: 'Login bem-sucedido.',
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        userId: user.id.toString(),
        username: user.username
      });
    } catch (error) {
      console.error("[LOGIN] Erro detalhado no login:", error);
      res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
    }
  });

  app.get("/api/auth/me", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({
        userId: req.user.userId,
        username: req.user.username
      });
    } catch (error) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }));

  app.post("/api/auth/logout", (req, res) => {
    try {
      res.json({ message: "Logout realizado com sucesso" });
    } catch (error) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Refresh token endpoint
  app.post("/api/auth/refresh", requireDatabase, async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token é obrigatório.' });
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({ message: 'Refresh token inválido ou expirado.' });
      }

      // Check if user still exists
      const numericUserId = parseInt(decoded.userId);
      if (isNaN(numericUserId)) {
        return res.status(401).json({ message: 'ID do usuário inválido.' });
      }

      const user = await storage.getUser(numericUserId);
      if (!user) {
        return res.status(401).json({ message: 'Usuário não encontrado.' });
      }

      // Generate new token pair
      const tokenPair = generateTokenPair(user.id.toString());

      res.json({
        message: 'Tokens renovados com sucesso!',
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        userId: user.id.toString(),
        username: user.username
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(500).json({ message: 'Erro interno do servidor ao renovar token.' });
    }
  });

  // Get all products for authenticated user
  app.get('/api/products', authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.user.userId);
      console.log(`🔍 [PRODUCTS] Buscando produtos para o usuário: ${userId}`);
      console.log(`🔍 [PRODUCTS] Token do usuário válido:`, !!req.user);

      if (isNaN(userId)) {
        console.error('❌ [PRODUCTS] ID do usuário inválido:', req.user.userId);
        return res.status(400).json([]);
      }

      const products = await storage.getProducts(userId);
      console.log(`✅ [PRODUCTS] Produtos encontrados: ${products?.length || 0}`);

      // Ensure we always return a valid array
      const safeProducts = Array.isArray(products) ? products : [];

      // Log the response structure for debugging
      console.log(`📤 [PRODUCTS] Retornando ${safeProducts.length} produtos para o cliente`);

      res.status(200).json(safeProducts);
    } catch (error) {
      console.error('❌ [PRODUCTS] Erro ao buscar produtos:', error);
      // Always return an empty array on error to prevent frontend crashes
      res.status(500).json([]);
    }
  }));

  // AnyCrawl credits endpoint - Protected with authentication
  app.get('/api/anycrawl/credits', authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const credits = await anyCrawlService.checkCredits();

      if (credits === null) {
        return res.status(503).json({
          error: 'AnyCrawl não disponível',
          available: false
        });
      }

      res.json({
        remaining_credits: credits,
        available: anyCrawlService.isAvailable()
      });

    } catch (error) {
      console.error('[API] Erro ao verificar créditos AnyCrawl:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }));

  // Get product stats for authenticated user
  app.get("/api/products/stats", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.user.userId);
      const stats = await storage.getProductStats(userId);

      // Cache stats por 1 minuto
      res.set({
        'Cache-Control': 'private, max-age=60',
        'ETag': `"stats-${userId}-${Date.now()}"`
      });

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch product stats" });
    }
  }));

  // Extract product info from uploaded image (screenshot)
  app.post("/api/products/extract-from-image", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { imageData, mimeType } = req.body;

      if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ error: "Image data (base64) is required" });
      }

      const { extractProductFromImage, cropProductImage } = await import('./services/vision-extractor.js');

      console.log(`[API] 📸 Extraindo produto de imagem para usuário ${req.user.userId}`);

      // Extrai dados do produto
      const productInfo = await extractProductFromImage(imageData, mimeType || 'image/png');

      // Tenta fazer crop da imagem do produto
      const croppedImage = await cropProductImage(imageData, mimeType || 'image/png');

      res.json({
        name: productInfo.name,
        price: productInfo.price,
        imageUrl: croppedImage, // Base64 da imagem cropada
        description: productInfo.description,
        brand: productInfo.brand,
        category: productInfo.category,
        confidence: productInfo.confidence,
        store: 'Extraído de Imagem'
      });

    } catch (error: any) {
      console.error("[API] ❌ Erro ao extrair produto de imagem:", error);
      res.status(500).json({
        error: error.message || "Falha ao processar imagem"
      });
    }
  }));

  // Verify URL without adding product
  app.post("/api/products/verify", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Valid URL is required" });
      }

      const scrapedProduct = await scrapeProductFromUrl(url);

      res.json({
        name: scrapedProduct.name,
        price: scrapedProduct.price,
        originalPrice: scrapedProduct.originalPrice,
        imageUrl: scrapedProduct.imageUrl,
        store: scrapedProduct.store,
        description: scrapedProduct.description
      });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ error: "Failed to verify product URL" });
    }
  }));

  // Add product manually
  app.post("/api/products", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, price, url, imageUrl, store, description, category, brand, tags, isPurchased } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Product name is required" });
      }

      const productData = {
        userId: parseInt(req.user.userId),
        url: url || `https://manual.product/${Date.now()}`,
        name,
        price: price?.toString() || null,
        originalPrice: null,
        imageUrl: imageUrl || null,
        store: store || "Adicionado Manualmente",
        description: description || null,
        category: category || "Outros",
        brand: brand || null,
        tags: tags || null,
        isPurchased: isPurchased || false,
      };

      const product = await storage.createProduct(productData);
      const productId = product.id;
      res.json({ id: productId, ...productData });
    } catch (error) {
      console.error("Manual product creation error:", error);
      res.status(500).json({ error: "Failed to add product manually" });
    }
  }));

  // Search products on AliExpress
  app.post("/api/products/search-aliexpress", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { searchTerm } = req.body;

      if (!searchTerm || typeof searchTerm !== 'string') {
        return res.status(400).json({ error: "Termo de busca é obrigatório" });
      }

      console.log(`[API] 🔍 Buscando produtos AliExpress: "${searchTerm}"`);

      const { searchAliExpressProducts } = await import('./services/aliexpress-api.js');
      const results = await searchAliExpressProducts(searchTerm, 10);

      if (!results || results.length === 0) {
        return res.json([]);
      }

      res.json(results);
    } catch (error) {
      console.error("AliExpress search error:", error);
      res.status(500).json({ error: "Falha ao buscar produtos na AliExpress" });
    }
  }));

  // Add product from URL
  app.post("/api/products/scrape", authenticateToken, rateLimitScraping, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Valid URL is required" });
      }

      console.log(`[API] Iniciando scraping para: ${url}`);
      let finalUrl = url;

      // ESTRATÉGIA 1: SHOPEE API - Tenta catálogo primeiro
      if (url.includes('shopee.com.br')) {
        try {
          const { isShopeeUrl, addShopeeAffiliateParams, fetchShopeeProduct } = await import('./services/shopee-api.js');
          if (isShopeeUrl(url)) {
            finalUrl = addShopeeAffiliateParams(url);
            console.log(`[API] ✅ Partner tag da Shopee aplicado: ${url} → ${finalUrl}`);

            // Tenta catálogo primeiro
            console.log(`[API] 🛍️ Shopee detectada - tentando API catálogo primeiro`);
            const catalogProduct = await fetchShopeeProduct(finalUrl);

            if (catalogProduct &&
              catalogProduct.name !== 'Produto Shopee' &&
              catalogProduct.name &&
              catalogProduct.name.length > 3 &&
              !catalogProduct.name.includes('|') &&
              catalogProduct.price && catalogProduct.price > 0) {

              console.log(`[API] ✅ Produto VÁLIDO encontrado via API Shopee: ${catalogProduct.name}`);

              const productData = {
                userId: parseInt(req.user.userId),
                url: finalUrl,
                name: catalogProduct.name,
                price: catalogProduct.price?.toString() || null,
                originalPrice: catalogProduct.originalPrice?.toString() || null,
                imageUrl: catalogProduct.imageUrl,
                store: catalogProduct.store,
                description: catalogProduct.description,
                category: catalogProduct.category,
                brand: catalogProduct.brand,
                tags: null,
                isPurchased: false,
              };

              const savedProduct = await storage.createProduct(productData);
              console.log(`[API] Produto da Shopee API salvo com sucesso: ${savedProduct.name}`);

              return res.status(201).json({
                message: 'Produto adicionado com sucesso via API Shopee!',
                product: savedProduct,
                scrapingSuccess: true,
                needsManualInput: false,
                extractionMethod: 'shopee-api',
                quality: {
                  hasName: true,
                  hasPrice: true,
                  hasImage: !!catalogProduct.imageUrl,
                  hasDescription: !!catalogProduct.description,
                  hasBrand: !!catalogProduct.brand
                }
              });
            }

            console.log(`[API] 🔄 API Shopee não encontrou produto - usando scraping`);
          }
        } catch (apiError: any) {
          console.error(`[API] Erro na API Shopee:`, apiError.message);
        }
      }

      // ESTRATÉGIA 2: ALIEXPRESS API - Tenta API primeiro  
      if (url.includes('aliexpress.com')) {
        try {
          const { isAliExpressUrl, fetchAliExpressProduct } = await import('./services/aliexpress-api.js');
          if (isAliExpressUrl(url)) {
            console.log(`[API] 🛒 AliExpress detectada - tentando API primeiro`);
            const apiProduct = await fetchAliExpressProduct(url);

            if (apiProduct &&
              apiProduct.name &&
              apiProduct.price &&
              apiProduct.price > 0) {

              console.log(`[API] ✅ Produto VÁLIDO encontrado via API AliExpress: ${apiProduct.name}`);

              const productData = {
                userId: parseInt(req.user.userId),
                url: apiProduct.url || url,
                name: apiProduct.name,
                price: apiProduct.price?.toString() || null,
                originalPrice: apiProduct.originalPrice?.toString() || null,
                imageUrl: apiProduct.imageUrl,
                store: apiProduct.store,
                description: apiProduct.description,
                category: apiProduct.category,
                brand: apiProduct.brand,
                tags: null,
                isPurchased: false,
              };

              const savedProduct = await storage.createProduct(productData);
              console.log(`[API] Produto da AliExpress API salvo com sucesso: ${savedProduct.name}`);

              return res.status(201).json({
                message: 'Produto adicionado com sucesso via API AliExpress!',
                product: savedProduct,
                scrapingSuccess: true,
                needsManualInput: false,
                extractionMethod: 'aliexpress-api',
                quality: {
                  hasName: true,
                  hasPrice: true,
                  hasImage: !!apiProduct.imageUrl,
                  hasDescription: !!apiProduct.description,
                  hasBrand: !!apiProduct.brand
                }
              });
            } else {
              console.log(`[API] ❌ API AliExpress retornou produto inválido:`, {
                hasName: !!apiProduct?.name,
                nameLength: apiProduct?.name?.length || 0,
                hasPrice: !!apiProduct?.price,
                priceValue: apiProduct?.price
              });
            }

            console.log(`[API] 🔄 API AliExpress falhou - usando scraping como fallback`);
          }
        } catch (apiError: any) {
          console.error(`[API] Erro na API AliExpress:`, apiError.message);
        }
      }

      // ESTRATÉGIA 3: OUTRAS LOJAS - Tenta outras APIs disponíveis
      try {
        console.log(`[API] 🔍 Tentando outras APIs disponíveis...`);
        const { fetchProductFromAPIs } = await import('./services/ecommerce-apis.js');
        const apiResults = await fetchProductFromAPIs(finalUrl);

        if (apiResults && apiResults.length > 0) {
          const bestProduct = apiResults[0]; // Usa o primeiro resultado (melhor qualidade)

          if (bestProduct.name &&
            bestProduct.name.length > 3 &&
            bestProduct.price &&
            bestProduct.price > 0) {

            console.log(`[API] ✅ Produto encontrado via outras APIs: ${bestProduct.name}`);

            const productData = {
              userId: parseInt(req.user.userId),
              url: bestProduct.url || finalUrl,
              name: bestProduct.name,
              price: bestProduct.price?.toString() || null,
              originalPrice: bestProduct.originalPrice?.toString() || null,
              imageUrl: bestProduct.imageUrl,
              store: bestProduct.store,
              description: bestProduct.description,
              category: bestProduct.category,
              brand: bestProduct.brand,
              tags: null,
              isPurchased: false,
            };

            const savedProduct = await storage.createProduct(productData);
            console.log(`[API] Produto de API externa salvo: ${savedProduct.name}`);

            return res.status(201).json({
              message: 'Produto adicionado com sucesso via API externa!',
              product: savedProduct,
              scrapingSuccess: true,
              needsManualInput: false,
              extractionMethod: 'external-api',
              quality: {
                hasName: true,
                hasPrice: true,
                hasImage: !!bestProduct.imageUrl,
                hasDescription: !!bestProduct.description,
                hasBrand: !!bestProduct.brand
              }
            });
          }
        }
      } catch (apiError: any) {
        console.error(`[API] Erro em APIs externas:`, apiError.message);
      }

      // ESTRATÉGIA 4: SCRAPING TRADICIONAL (com AnyCrawl como fallback embutido)
      console.log(`[API] 🌐 Todas APIs falharam - usando scraping tradicional (+ AnyCrawl se necessário)`);
      const scrapedProduct = await scrapeProductFromUrl(finalUrl);

      if (!scrapedProduct || !scrapedProduct.name || scrapedProduct.name.length < 3) {
        return res.status(400).json({
          error: 'Não foi possível extrair informações do produto. Verifique se a URL está correta.'
        });
      }

      const productData = {
        userId: parseInt(req.user.userId),
        url: finalUrl,
        name: scrapedProduct.name,
        price: scrapedProduct.price?.toString() || null,
        originalPrice: scrapedProduct.originalPrice?.toString() || null,
        imageUrl: scrapedProduct.imageUrl,
        store: scrapedProduct.store,
        description: scrapedProduct.description,
        category: scrapedProduct.category || "Outros",
        brand: scrapedProduct.brand,
        isPurchased: false
      };

      const product = await storage.createProduct(productData);
      console.log(`[API] Produto criado com sucesso: ${product.name}`);

      // ÚLTIMO PASSO: Aplica partner tag da Amazon se necessário
      if (url.includes('amazon.com') && !url.includes(`tag=${process.env.AMAZON_PARTNER_TAG}`)) {
        try {
          const { addPartnerTagToAmazonUrl, extractASINFromUrl } = await import('./services/amazon-api.js');
          const { isShopeeUrl, addShopeeAffiliateParams } = await import('./services/shopee-api.js');
          const asin = extractASINFromUrl(url);
          if (asin && process.env.AMAZON_PARTNER_TAG) {
            const updatedUrl = addPartnerTagToAmazonUrl(url, asin);

            // Atualiza a URL do produto no banco
            await storage.updateProduct(product.id, { url: updatedUrl }, parseInt(req.user.userId));
            product.url = updatedUrl; // Atualiza objeto para resposta

            console.log(`[API] ✅ Partner tag aplicado após criação: ${url} → ${updatedUrl}`);
          }
        } catch (error: any) {
          console.warn(`[API] ⚠️ Erro ao aplicar partner tag após criação:`, error.message);
        }
      }

      // Determina se o scraping foi bem-sucedido
      const isGenericProduct = scrapedProduct.name === `Produto de ${scrapedProduct.store}` ||
        scrapedProduct.name === 'Produto encontrado';
      const hasPrice = scrapedProduct.price && scrapedProduct.price > 0;
      const hasValidImage = scrapedProduct.imageUrl &&
        !scrapedProduct.imageUrl.includes('placeholder');

      const scrapingSuccess = !isGenericProduct && hasPrice && hasValidImage;
      const needsManualInput = !hasPrice || isGenericProduct;

      // Retorna o produto com informações de qualidade do scraping
      res.json({
        ...product,
        scrapingSuccess,
        needsManualInput,
        extractionMethod: isGenericProduct ? 'fallback' :
          hasPrice ? 'structured' : 'partial',
        quality: {
          hasName: !isGenericProduct,
          hasPrice: hasPrice,
          hasImage: hasValidImage,
          hasDescription: !!scrapedProduct.description,
          hasBrand: !!scrapedProduct.brand
        }
      });
    } catch (error) {
      console.error("Scraping error:", error);
      res.status(500).json({
        error: "Failed to scrape and add product",
        details: (error as any).message,
        canRetryWithManual: true,
        suggestion: "Tente adicionar o produto manualmente com as informações que você possui"
      });
    }
  }));

  // Add product manually
  app.post("/api/products/manual", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { url, name, price, originalPrice, imageUrl, store, description, category, brand } = req.body;

      let finalUrl = url;
      // Aplica partner tag da Shopee se necessário
      if (url.includes('shopee.com.br')) {
        try {
          const { isShopeeUrl, addShopeeAffiliateParams } = await import('./services/shopee-api.js');
          if (isShopeeUrl(url)) {
            finalUrl = addShopeeAffiliateParams(url);
            console.log(`[API Manual] ✅ Partner tag da Shopee aplicado: ${url} → ${finalUrl}`);
          }
        } catch (error: any) {
          console.warn(`[API Manual] ⚠️ Erro ao aplicar partner tag da Shopee:`, error.message);
        }
      }

      // Aplica partner tag da AliExpress se necessário
      if (url.includes('aliexpress.com')) {
        try {
          const { isAliExpressUrl, addAliExpressAffiliateParams } = await import('./services/aliexpress-api.js');
          if (isAliExpressUrl(url)) {
            finalUrl = addAliExpressAffiliateParams(url);
            console.log(`[API Manual] ✅ Partner tag da AliExpress aplicado: ${url} → ${finalUrl}`);
          }
        } catch (error: any) {
          console.warn(`[API Manual] ⚠️ Erro ao aplicar partner tag da AliExpress:`, error.message);
        }
      }


      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Valid URL is required" });
      }

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Product name is required" });
      }

      const productData = {
        userId: parseInt(req.user.userId),
        url: finalUrl,
        name,
        price: price?.toString() || null,
        originalPrice: originalPrice?.toString() || null,
        imageUrl: imageUrl || null,
        store: store || "Loja Manual",
        description: description || `Produto adicionado manualmente: ${name}`,
        category: category || "Geral",
        brand: brand || null,
        isPurchased: false
      };

      const product = await storage.createProduct(productData);

      // ÚLTIMO PASSO: Aplica partner tag da Amazon se necessário
      if (url.includes('amazon.com') && !url.includes(`tag=${process.env.AMAZON_PARTNER_TAG}`)) {
        try {
          const { addPartnerTagToAmazonUrl, extractASINFromUrl } = await import('./services/amazon-api.js');
          const { isShopeeUrl, addShopeeAffiliateParams } = await import('./services/shopee-api.js');
          const asin = extractASINFromUrl(url);
          if (asin && process.env.AMAZON_PARTNER_TAG) {
            const updatedUrl = addPartnerTagToAmazonUrl(url, asin);

            // Atualiza a URL do produto no banco
            await storage.updateProduct(product.id, { url: updatedUrl }, parseInt(req.user.userId));
            product.url = updatedUrl; // Atualiza objeto para resposta

            console.log(`[API Manual] ✅ Partner tag aplicado: ${url} → ${updatedUrl}`);
          }
        } catch (error: any) {
          console.warn(`[API Manual] ⚠️ Erro ao aplicar partner tag:`, error.message);
        }
      }

      res.json(product);
    } catch (error) {
      console.error("Manual product creation error:", error);
      res.status(500).json({ error: "Failed to create manual product" });
    }
  }));

  // Update product
  app.put("/api/products/:id", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = parseInt(req.user.userId);

      console.log(`[UPDATE Product] ID: ${productId}, UserId: ${userId}`);
      console.log(`[UPDATE Product] Body:`, JSON.stringify(req.body, null, 2));

      // Converte price e originalPrice para números, ou null se vazios
      const updateData: any = { ...req.body };

      // Converte price: null se vazio, número se válido, ou remove se inválido
      if (updateData.price !== undefined) {
        if (updateData.price === '' || updateData.price === null) {
          updateData.price = null;
        } else {
          const parsedPrice = parseFloat(updateData.price);
          if (!isNaN(parsedPrice)) {
            updateData.price = parsedPrice;
          } else {
            delete updateData.price;
          }
        }
      }

      // Converte originalPrice: null se vazio, número se válido, ou remove se inválido
      if (updateData.originalPrice !== undefined) {
        if (updateData.originalPrice === '' || updateData.originalPrice === null) {
          updateData.originalPrice = null;
        } else {
          const parsedOriginalPrice = parseFloat(updateData.originalPrice);
          if (!isNaN(parsedOriginalPrice)) {
            updateData.originalPrice = parsedOriginalPrice;
          } else {
            delete updateData.originalPrice;
          }
        }
      }

      console.log(`[UPDATE Product] Processed data:`, JSON.stringify(updateData, null, 2));

      const product = await storage.updateProduct(productId, updateData, userId);

      if (!product) {
        console.log(`[UPDATE Product] Product not found: ${productId}`);
        return res.status(404).json({ error: "Product not found" });
      }

      console.log(`[UPDATE Product] Success: ${product.id} - ${product.name}`);
      res.json(product);
    } catch (error) {
      console.error("[UPDATE Product] Error:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  }));

  // Fix Amazon URLs with partner tag
  app.post("/api/products/fix-amazon-urls", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.user.userId);
      console.log(`[Fix Amazon URLs] Corrigindo URLs para usuário: ${userId}`);

      const products = await storage.getProducts(userId);
      const { addPartnerTagToAmazonUrl, extractASINFromUrl } = await import('./services/amazon-api.js');

      let updatedCount = 0;

      for (const product of products) {
        if (product.url && product.url.includes('amazon.com') && !product.url.includes('tag=')) {
          const asin = extractASINFromUrl(product.url);
          if (asin) {
            const newUrl = addPartnerTagToAmazonUrl(product.url, asin);
            if (newUrl !== product.url) {
              await storage.updateProduct(product.id, { url: newUrl }, userId);
              console.log(`[Fix Amazon URLs] Produto ${product.id}: ${product.url} → ${newUrl}`);
              updatedCount++;
            }
          }
        }
      }

      res.json({
        success: true,
        message: `${updatedCount} produtos atualizados com partner tag`,
        updatedCount
      });
    } catch (error) {
      console.error("Fix Amazon URLs error:", error);
      res.status(500).json({ error: "Failed to fix Amazon URLs" });
    }
  }));

  // Delete product
  app.delete("/api/products/:id", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = parseInt(req.user.userId);

      if (isNaN(productId)) {
        console.log(`[DELETE Product] Invalid product ID: ${req.params.id}`);
        return res.status(400).json({ error: "Invalid product ID" });
      }

      console.log(`[DELETE Product] Attempting to delete product ${productId} for user ${userId}`);

      // First verify the product exists and belongs to the user
      const existingProduct = await storage.getProduct(productId, userId);
      if (!existingProduct) {
        console.log(`[DELETE Product] Product ${productId} not found or not owned by user ${userId}`);
        return res.status(404).json({
          error: "Product not found or access denied",
          productId: productId,
          userId: userId
        });
      }

      console.log(`[DELETE Product] Product found: ${existingProduct.name} (ID: ${productId})`);

      // Attempt deletion
      const success = await storage.deleteProduct(productId, userId);

      if (!success) {
        console.error(`[DELETE Product] Failed to delete product ${productId} - storage.deleteProduct returned false`);
        return res.status(500).json({
          error: "Failed to delete product from database",
          productId: productId,
          userId: userId
        });
      }

      console.log(`[DELETE Product] ✅ Successfully deleted product ${productId} (${existingProduct.name}) for user ${userId}`);

      // Verify deletion by checking if product still exists
      const verifyDeletion = await storage.getProduct(productId, userId);
      if (verifyDeletion) {
        console.error(`[DELETE Product] ❌ ERROR: Product ${productId} still exists after deletion!`);
        return res.status(500).json({ error: "Product deletion failed - product still exists" });
      }

      console.log(`[DELETE Product] ✅ Deletion verified - product ${productId} no longer exists`);
      res.json({
        success: true,
        message: "Product deleted successfully",
        productId: productId,
        productName: existingProduct.name
      });
    } catch (error) {
      console.error(`[DELETE Product] Exception during deletion:`, error);
      res.status(500).json({
        error: "Failed to delete product",
        details: (error as any).message || String(error),
        stack: process.env.NODE_ENV === 'development' ? (error as any).stack : undefined
      });
    }
  }));

  // Re-scrape product
  app.post("/api/products/:id/re-scrape", authenticateToken, rateLimitScraping, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = parseInt(req.user.userId);

      if (isNaN(productId)) {
        return res.status(400).json({ error: "Invalid product ID" });
      }

      // Get existing product
      const existingProduct = await storage.getProduct(productId, userId);
      if (!existingProduct) {
        return res.status(404).json({ error: "Product not found" });
      }

      console.log(`[RE-SCRAPE] Re-scraping product ${productId}: ${existingProduct.name}`);

      // Re-scrape the product using the existing URL
      const scrapedProduct = await scrapeProductFromUrl(existingProduct.url);

      if (!scrapedProduct || !scrapedProduct.name) {
        return res.status(400).json({
          error: "Failed to re-scrape product. URL may be invalid or inaccessible."
        });
      }

      // Update product with new scraped data
      const updateData = {
        name: scrapedProduct.name,
        price: scrapedProduct.price?.toString() || existingProduct.price,
        originalPrice: scrapedProduct.originalPrice?.toString() || existingProduct.originalPrice,
        imageUrl: scrapedProduct.imageUrl || existingProduct.imageUrl,
        description: scrapedProduct.description || existingProduct.description,
        category: scrapedProduct.category || existingProduct.category,
        brand: scrapedProduct.brand || existingProduct.brand,
        store: scrapedProduct.store || existingProduct.store
      };

      const updatedProduct = await storage.updateProduct(productId, updateData, userId);

      console.log(`[RE-SCRAPE] ✅ Successfully re-scraped product ${productId}`);
      res.json({
        success: true,
        message: "Product re-scraped successfully",
        product: updatedProduct
      });
    } catch (error) {
      console.error(`[RE-SCRAPE] Error re-scraping product:`, error);
      res.status(500).json({
        error: "Failed to re-scrape product",
        details: (error as any).message
      });
    }
  }));

  // APIs para histórico de preços
  app.get("/api/products/:id/price-history", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const history = priceHistoryService.getPriceHistory(productId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  }));

  // APIs para notificações
  app.get("/api/notifications", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.user.userId);
      const notifications = notificationService.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  }));

  app.get("/api/notifications/unread-count", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.user.userId);
      const count = notificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to get unread count" });
    }
  }));

  // Payment routes
  app.post("/api/payments", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { productId, paymentMethod, bank, installments, installmentValue, totalValue, purchaseDate, firstDueDate } = req.body;
      const userId = parseInt(req.user.userId);

      console.log(`[Payment Creation] Dados recebidos:`, {
        productId, paymentMethod, bank, installments, installmentValue, totalValue, purchaseDate, firstDueDate, userId
      });

      if (!productId || !paymentMethod || !bank) {
        return res.status(400).json({ error: "Dados obrigatórios faltando: productId, paymentMethod, bank" });
      }

      // Verificar se o produto pertence ao usuário
      const product = await storage.getProductById(productId, userId);
      if (!product) {
        console.error(`[Payment Creation] Produto ${productId} não encontrado para usuário ${userId}`);
        return res.status(404).json({ error: "Product not found" });
      }

      const paymentId = await storage.addPayment({
        productId,
        paymentMethod,
        bank,
        installments: installments || 1,
        installmentValue: installmentValue || totalValue,
        totalValue: totalValue || (installmentValue * (installments || 1)),
        purchaseDate,
        firstDueDate
      });

      console.log(`[Payment Creation] Pagamento criado com ID: ${paymentId}`);
      res.json({ id: paymentId, message: "Payment created successfully" });
    } catch (error) {
      console.error("Payment creation error:", error);
      res.status(500).json({ error: "Failed to create payment", details: (error as any).message });
    }
  }));

  app.get("/api/payments", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.user.userId);
      const payments = await storage.getUserPayments(userId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  }));

  // Get user installments
  app.get("/api/installments", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.user.userId);
      console.log(`[API] Buscando parcelas para usuário: ${userId}`);
      const installments = await storage.getUserInstallments(userId);
      console.log(`[API] Parcelas retornadas: ${installments.length}`);
      res.json(installments);
    } catch (error) {
      console.error("Error fetching installments:", error);
      res.status(500).json({ error: "Failed to fetch installments" });
    }
  }));

  // Get payment data for a specific product
  app.get("/api/payments/product/:productId", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const productId = parseInt(req.params.productId);
      const userId = parseInt(req.user.userId);

      console.log(`[Payment Route] Buscando pagamento para produto ${productId} do usuário ${userId}`);

      const paymentData = await storage.getPaymentByProductId(productId, userId);

      if (!paymentData) {
        return res.status(404).json({ error: "Nenhum pagamento encontrado para este produto" });
      }

      res.json(paymentData);
    } catch (error) {
      console.error("Error getting payment data:", error);
      res.status(500).json({ error: "Erro ao buscar dados de pagamento" });
    }
  }));

  // Update payment data
  app.put("/api/payments/:paymentId", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const paymentId = parseInt(req.params.paymentId);
      const userId = parseInt(req.user.userId);
      const updates = req.body;

      const success = await storage.updatePayment(paymentId, updates, userId);

      if (success) {
        res.json({ message: "Pagamento atualizado com sucesso" });
      } else {
        res.status(404).json({ error: "Pagamento não encontrado" });
      }
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({ error: "Erro ao atualizar pagamento" });
    }
  }));

  // Delete payment by product ID
  app.delete("/api/payments/product/:productId", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.user.userId);
      const productId = parseInt(req.params.productId);

      console.log('[Payment Deletion] Excluindo pagamento do produto:', productId, 'usuário:', userId);

      const success = await storage.deletePaymentByProductId(productId, userId);

      if (success) {
        res.json({ message: "Payment deleted successfully" });
      } else {
        res.status(404).json({ error: "Payment not found or could not be deleted" });
      }
    } catch (error) {
      console.error('Erro ao excluir pagamento:', error);
      res.status(500).json({ error: "Failed to delete payment" });
    }
  }));

  // Finance routes
  app.get("/api/finances", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.user.userId);
      const finances = await storage.getFinances(userId);
      res.json(finances);
    } catch (error) {
      console.error("Error fetching finances:", error);
      res.status(500).json({ error: "Failed to fetch finances" });
    }
  }));

  app.post("/api/finances", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.user.userId);
      const { mes_ano, receita, gastos } = req.body;

      if (!mes_ano || receita === undefined || gastos === undefined) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const financeId = await storage.addFinance({
        userId,
        mes_ano,
        receita: parseFloat(receita),
        gastos: parseFloat(gastos)
      });

      res.json({ id: financeId, message: "Finance record created successfully" });
    } catch (error) {
      console.error("Error creating finance record:", error);
      res.status(500).json({ error: "Failed to create finance record" });
    }
  }));

  app.put("/api/finances/:id", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const financeId = parseInt(req.params.id);
      const userId = parseInt(req.user.userId);
      const { mes_ano, receita, gastos } = req.body;

      const success = await storage.updateFinance(financeId, {
        mes_ano,
        receita: parseFloat(receita),
        gastos: parseFloat(gastos)
      }, userId);

      if (!success) {
        return res.status(404).json({ error: "Finance record not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating finance record:", error);
      res.status(500).json({ error: "Failed to update finance record" });
    }
  }));

  app.delete("/api/finances/:id", authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const financeId = parseInt(req.params.id);
      const userId = parseInt(req.user.userId);

      const success = await storage.deleteFinance(financeId, userId);

      if (!success) {
        return res.status(404).json({ error: "Finance record not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting finance record:", error);
      res.status(500).json({ error: "Failed to delete finance record" });
    }
  }));

  // Health check endpoint for infrastructure monitoring
  // Handles HEAD /api requests from Replit infrastructure
  app.all("/api", (req, res) => {
    if (req.method === 'HEAD' || req.method === 'GET') {
      // Lightweight health check response for infrastructure
      res.status(200).json({
        status: "healthy",
        service: "api",
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(405).json({
        error: "Method not allowed",
        allowed: ["GET", "HEAD"]
      });
    }
  });

  // API route not found handler - prevents HTML responses for API calls
  app.use("/api/*", (req, res) => {
    console.error(`[API] Route not found: ${req.method} ${req.path}`);
    res.status(404).json({
      error: "API endpoint not found",
      path: req.path,
      method: req.method
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}