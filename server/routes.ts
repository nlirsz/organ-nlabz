import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { scrapeProductFromUrl } from "./services/scraper.js";
import { insertProductSchema, updateProductSchema } from "@shared/schema.js";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all products for a user
  app.get("/api/products/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId) || 1; // Default to user 1
      const products = await storage.getProducts(userId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Get product stats for a user
  app.get("/api/products/stats/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId) || 1; // Default to user 1
      const stats = await storage.getProductStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product stats" });
    }
  });

  // Verify URL without adding product
  app.post("/api/products/verify", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Valid URL is required" });
      }

      // Scrape product information without saving
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
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to verify product URL" });
      }
    }
  });

  // Add product from URL
  app.post("/api/products/scrape", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Valid URL is required" });
      }

      // Scrape product information
      const scrapedProduct = await scrapeProductFromUrl(url);
      
      // Create product in storage
      const productData = {
        userId: 1, // Default to user 1
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

      const validatedProduct = insertProductSchema.parse(productData);
      const product = await storage.createProduct(validatedProduct);
      
      res.json(product);
    } catch (error) {
      console.error("Scraping error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid product data", details: error.errors });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to scrape and add product" });
      }
    }
  });

  // Update product
  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = 1; // Default to user 1
      const validatedData = updateProductSchema.parse(req.body);
      
      const product = await storage.updateProduct(id, validatedData, userId);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid product data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update product" });
      }
    }
  });

  // Delete product
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = 1; // Default to user 1
      const deleted = await storage.deleteProduct(id, userId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
