import type { Express } from "express";
import { createServer, type Server } from "http";
import { scrapeProductFromUrl } from "./services/scraper.js";
import { priceHistoryService } from "./services/priceHistory.js";
import { notificationService } from "./services/notifications.js";
import { insertProductSchema, updateProductSchema } from "@shared/schema.js";
import { z } from "zod";
import { User } from "./models/User";
import { generateToken, authenticateToken, type AuthenticatedRequest } from "./middleware/auth";
import mongoose from "mongoose";

// Esquema do produto para MongoDB
const productSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: String,
  name: { type: String, required: true },
  price: String,
  originalPrice: String,
  imageUrl: String,
  store: String,
  description: String,
  category: { type: String, default: "Geral" },
  brand: String,
  tags: String,
  priority: { type: String, default: "medium" },
  notes: String,
  isPurchased: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

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
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(409).json({ message: 'Usuário já existe.' });
      }

      // Create new user
      const user = new User({ username, password });
      await user.save();

      // Generate token
      const token = generateToken(user._id.toString());

      res.status(201).json({
        message: 'Usuário registrado com sucesso!',
        token,
        userId: user._id.toString()
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
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ message: 'Credenciais inválidas (usuário não encontrado).' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Credenciais inválidas (senha incorreta).' });
      }

      // Generate token
      const token = generateToken(user._id.toString());

      res.json({
        message: 'Login bem-sucedido.',
        token,
        userId: user._id.toString(),
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
      console.log('Buscando produtos para usuário:', req.user.userId);

      // Verificar se o usuário existe no banco
      const userExists = await User.findById(req.user.userId);
      console.log('Usuário existe no banco:', !!userExists);

      // Verificar quantos produtos existem no total
      const totalProducts = await Product.countDocuments();
      console.log('Total de produtos no banco:', totalProducts);

      // Verificar produtos deste usuário
      const products = await Product.find({ userId: req.user.userId }).sort({ createdAt: -1 });
      console.log(`Encontrados ${products.length} produtos para o usuário ${req.user.userId}`);

      // Log dos primeiros produtos para debug
      if (products.length > 0) {
        console.log('Primeiro produto encontrado:', {
          id: products[0]._id,
          name: products[0].name,
          userId: products[0].userId
        });
      }

      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Get product stats for authenticated user
  app.get("/api/products/stats/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      console.log('=== STATS FETCH DEBUG ===');
      console.log('🔍 Buscando estatísticas para usuário:', req.user.userId);
      console.log('🔍 Parâmetro userId da URL:', req.params.userId);
      console.log('🔍 Comparação userId:', {
        fromToken: req.user.userId,
        fromParams: req.params.userId,
        matches: req.user.userId === req.params.userId
      });

      const products = await Product.find({ userId: req.user.userId });
      console.log('📊 Produtos encontrados para estatísticas:', products.length);

      if (products.length > 0) {
        console.log('📝 Tipos de produtos encontrados:', {
          total: products.length,
          purchased: products.filter(p => p.isPurchased).length,
          withPrice: products.filter(p => p.price).length
        });
      }

      const totalItems = products.length;
      const purchasedItems = products.filter(p => p.isPurchased).length;
      const estimatedTotal = products.reduce((sum, p) => {
        const price = p.price ? parseFloat(p.price) : 0;
        return sum + price;
      }, 0);

      const stats = {
        totalItems,
        purchasedItems,
        estimatedTotal
      };

      console.log('✅ Estatísticas calculadas:', stats);
      console.log('=== STATS FETCH DEBUG END ===\n');
      res.json(stats);
    } catch (error) {
      console.error("❌ Error fetching stats:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
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

  // Add product from URL
  app.post("/api/products/scrape", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Valid URL is required" });
      }

      const scrapedProduct = await scrapeProductFromUrl(url);

      const product = new Product({
        userId: req.user.userId,
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
      });

      await product.save();

      res.json(product);
    } catch (error) {
      console.error("Scraping error:", error);
      res.status(500).json({ error: "Failed to scrape and add product" });
    }
  });

  // Update product
  app.put("/api/products/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const product = await Product.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.userId },
        { ...req.body, updatedAt: new Date() },
        { new: true }
      );

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
      const product = await Product.findOneAndDelete({
        _id: req.params.id,
        userId: req.user.userId
      });

      if (!product) {
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
      const notifications = notificationService.getUserNotifications(req.user.userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/:userId/unread-count", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const count = notificationService.getUnreadCount(req.user.userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}