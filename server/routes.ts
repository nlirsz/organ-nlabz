import type { Express } from "express";
import { createServer, type Server } from "http";
import { scrapeProductFromUrl } from "./services/scraper.js";
import { priceHistoryService } from "./services/priceHistory.js";
import { notificationService } from "./services/notifications.js";
import { insertProductSchema, updateProductSchema } from "@shared/schema.js";
import { z } from "zod";
import { storage } from "./storage";
import { generateToken, authenticateToken, type AuthenticatedRequest } from "./middleware/auth";
import bcrypt from "bcryptjs";



export async function registerRoutes(app: Express): Promise<Server> {

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
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

      // Generate token
      const token = generateToken(user.id.toString());

      res.status(201).json({
        message: 'Usuário registrado com sucesso!',
        token,
        userId: user.id.toString()
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: 'Erro interno do servidor ao registrar usuário.' });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
      }

      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Credenciais inválidas (usuário não encontrado).' });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Credenciais inválidas (senha incorreta).' });
      }

      // Generate token
      const token = generateToken(user.id.toString());

      res.json({
        message: 'Login bem-sucedido.',
        token,
        userId: user.id.toString(),
        username: user.username
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      res.json({
        userId: req.user.userId,
        username: req.user.username
      });
    } catch (error) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get all products for authenticated user
  app.get("/api/products", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.user.userId);
      const products = await storage.getProducts(userId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Get product stats for authenticated user
  app.get("/api/products/stats/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.user.userId);
      const stats = await storage.getProductStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch product stats" });
    }
  });

  // Verify URL without adding product
  app.post("/api/products/verify", authenticateToken, async (req: AuthenticatedRequest, res) => {
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
  });

  // Add product manually
  app.post("/api/products", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, price, url, imageUrl, store, description, category, brand, isPurchased } = req.body;

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
        isPurchased: isPurchased || false,
      };

      const productId = await storage.addProduct(productData);
      res.json({ id: productId, ...productData });
    } catch (error) {
      console.error("Manual product creation error:", error);
      res.status(500).json({ error: "Failed to add product manually" });
    }
  });

  // Add product from URL
  app.post("/api/products/scrape", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Valid URL is required" });
      }

      const scrapedProduct = await scrapeProductFromUrl(url);

      const productData = {
        userId: parseInt(req.user.userId),
        url,
        name: scrapedProduct.name,
        price: scrapedProduct.price?.toString() || null,
        originalPrice: scrapedProduct.originalPrice?.toString() || null,
        imageUrl: scrapedProduct.imageUrl,
        store: scrapedProduct.store,
        description: scrapedProduct.description,
        category: scrapedProduct.category || "Geral",
        brand: scrapedProduct.brand,
        isPurchased: false
      };

      const product = await storage.createProduct(productData);
      
      // Retorna o produto com informação se foi scraping bem-sucedido
      res.json({
        ...product,
        scrapingSuccess: scrapedProduct.name !== `Produto de ${scrapedProduct.store}`,
        needsManualInput: !scrapedProduct.price || scrapedProduct.name === `Produto de ${scrapedProduct.store}`
      });
    } catch (error) {
      console.error("Scraping error:", error);
      res.status(500).json({ 
        error: "Failed to scrape and add product",
        canRetryWithManual: true 
      });
    }
  });

  // Add product manually
  app.post("/api/products/manual", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { url, name, price, originalPrice, imageUrl, store, description, category, brand } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Valid URL is required" });
      }

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Product name is required" });
      }

      const productData = {
        userId: parseInt(req.user.userId),
        url,
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
      res.json(product);
    } catch (error) {
      console.error("Manual product creation error:", error);
      res.status(500).json({ error: "Failed to create manual product" });
    }
  });

  // Update product
  app.put("/api/products/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = parseInt(req.user.userId);
      
      const product = await storage.updateProduct(productId, req.body, userId);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Delete product
  app.delete("/api/products/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = parseInt(req.user.userId);
      
      const success = await storage.deleteProduct(productId, userId);

      if (!success) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // APIs para histórico de preços
  app.get("/api/products/:id/price-history", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const productId = parseInt(req.params.id);
      const history = priceHistoryService.getPriceHistory(productId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });

  // APIs para notificações
  app.get("/api/notifications/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.user.userId);
      const notifications = notificationService.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/:userId/unread-count", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.user.userId);
      const count = notificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}