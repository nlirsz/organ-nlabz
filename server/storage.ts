import { users, products, type User, type InsertUser, type Product, type InsertProduct, type UpdateProduct } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Product operations
  getProducts(userId: number): Promise<Product[]>;
  getProduct(id: number, userId: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: UpdateProduct, userId: number): Promise<Product | undefined>;
  deleteProduct(id: number, userId: number): Promise<boolean>;
  getProductStats(userId: number): Promise<{
    totalItems: number;
    purchasedItems: number;
    estimatedTotal: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private currentUserId: number;
  private currentProductId: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.currentUserId = 1;
    this.currentProductId = 1;
    
    // Create default user
    this.createDefaultUser();
    
    // Add sample products for testing
    this.addSampleProducts();
  }
  
  private createDefaultUser() {
    const defaultUser: User = {
      id: 1,
      username: "usuario_padrao",
      password: "123456"
    };
    this.users.set(1, defaultUser);
    this.currentUserId = 2;
  }
  
  private addSampleProducts() {
    const sampleProducts = [
      {
        userId: 1,
        url: "https://example.com/mouse-gamer",
        name: "Mouse Gamer RGB",
        price: "199.99",
        originalPrice: "299.99",
        imageUrl: "https://via.placeholder.com/300x300/4CAF50/FFFFFF?text=Mouse+Gamer",
        store: "TechStore",
        description: "Mouse gamer com RGB e 7 botões programáveis",
        category: "Eletronicos",
        brand: "Logitech",
        isPurchased: false
      },
      {
        userId: 1,
        url: "https://example.com/smartphone",
        name: "Smartphone Galaxy A54",
        price: "1299.99",
        originalPrice: "1499.99",
        imageUrl: "https://via.placeholder.com/300x300/2196F3/FFFFFF?text=Smartphone",
        store: "MobileWorld",
        description: "Smartphone com tela de 6.5 polegadas e câmera tripla",
        category: "Eletronicos",
        brand: "Samsung",
        isPurchased: false
      },
      {
        userId: 1,
        url: "https://example.com/camiseta",
        name: "Camiseta Básica Cotton",
        price: "39.99",
        originalPrice: null,
        imageUrl: "https://via.placeholder.com/300x300/FF9800/FFFFFF?text=Camiseta",
        store: "FashionStore",
        description: "Camiseta básica 100% algodão",
        category: "Roupas",
        brand: "BasicWear",
        isPurchased: false
      },
      {
        userId: 1,
        url: "https://example.com/jogo-ps5",
        name: "The Last of Us Part II",
        price: "149.99",
        originalPrice: "199.99",
        imageUrl: "https://via.placeholder.com/300x300/9C27B0/FFFFFF?text=Game+PS5",
        store: "GameStore",
        description: "Jogo exclusivo para PlayStation 5",
        category: "Games",
        brand: "Sony",
        isPurchased: true
      },
      {
        userId: 1,
        url: "https://example.com/presente",
        name: "Kit Presente Romântico",
        price: "89.99",
        originalPrice: null,
        imageUrl: "https://via.placeholder.com/300x300/E91E63/FFFFFF?text=Presente",
        store: "GiftShop",
        description: "Kit com chocolates, flores e cartão",
        category: "Presentes",
        brand: "RomanticGifts",
        isPurchased: false
      }
    ];
    
    sampleProducts.forEach(product => {
      const id = this.currentProductId++;
      const now = new Date();
      const fullProduct = {
        ...product,
        id,
        createdAt: now,
        updatedAt: now,
        tags: null,
        priority: "medium",
        notes: null
      };
      this.products.set(id, fullProduct);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProducts(userId: number): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter(product => product.userId === userId)
      .sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );
  }

  async getProduct(id: number, userId: number): Promise<Product | undefined> {
    const product = this.products.get(id);
    return product && product.userId === userId ? product : undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const now = new Date();
    const product: Product = { 
      ...insertProduct, 
      id,
      createdAt: now,
      updatedAt: now,
      description: insertProduct.description || null,
      price: insertProduct.price || null,
      originalPrice: insertProduct.originalPrice || null,
      imageUrl: insertProduct.imageUrl || null,
      store: insertProduct.store || null,
      category: insertProduct.category || "Geral",
      brand: insertProduct.brand || null,
      tags: insertProduct.tags || null,
      priority: insertProduct.priority || "medium",
      notes: insertProduct.notes || null,
      isPurchased: insertProduct.isPurchased || false
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: number, updateProduct: UpdateProduct, userId: number): Promise<Product | undefined> {
    const existingProduct = this.products.get(id);
    if (!existingProduct || existingProduct.userId !== userId) return undefined;
    
    const updatedProduct: Product = {
      ...existingProduct,
      ...updateProduct,
      updatedAt: new Date()
    };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number, userId: number): Promise<boolean> {
    const product = this.products.get(id);
    if (!product || product.userId !== userId) return false;
    return this.products.delete(id);
  }

  async getProductStats(userId: number): Promise<{
    totalItems: number;
    purchasedItems: number;
    estimatedTotal: number;
  }> {
    const products = Array.from(this.products.values()).filter(p => p.userId === userId);
    const totalItems = products.length;
    const purchasedItems = products.filter(p => p.isPurchased).length;
    const estimatedTotal = products.reduce((sum, p) => {
      const price = p.price ? parseFloat(p.price) : 0;
      return sum + price;
    }, 0);

    return {
      totalItems,
      purchasedItems,
      estimatedTotal
    };
  }
}

export const storage = new MemStorage();
