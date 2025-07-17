import { users, products, payments, installments, type User, type InsertUser, type Product, type InsertProduct, type UpdateProduct } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Product operations
  getProducts(userId: number): Promise<Product[]>;
  getProduct(id: number, userId: number): Promise<Product | undefined>;
  getProductById(id: number, userId: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: UpdateProduct, userId: number): Promise<Product | undefined>;
  deleteProduct(id: number, userId: number): Promise<boolean>;
  getProductStats(userId: number): Promise<{
    totalItems: number;
    purchasedItems: number;
    estimatedTotal: number;
  }>;

  // Payment operations
  addPayment(payment: {
    productId: number;
    paymentMethod: string;
    bank: string;
    installments: number;
    installmentValue: number;
    totalValue: number;
    purchaseDate: string;
    firstDueDate: string;
  }): Promise<number>;
  getUserPayments(userId: number): Promise<any[]>;
  getUserInstallments(userId: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getProducts(userId: number): Promise<Product[]> {
    const productList = await db
      .select()
      .from(products)
      .where(eq(products.userId, userId))
      .orderBy(products.createdAt);
    return productList;
  }

  async getProduct(id: number, userId: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.userId, userId)));
    return product || undefined;
  }

  async getProductById(id: number, userId: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.userId, userId)));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async updateProduct(id: number, updateProduct: UpdateProduct, userId: number): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ ...updateProduct, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.userId, userId)))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getProductStats(userId: number): Promise<{
    totalItems: number;
    purchasedItems: number;
    estimatedTotal: number;
  }> {
    const userProducts = await db
      .select()
      .from(products)
      .where(eq(products.userId, userId));

    const totalItems = userProducts.length;
    const purchasedItems = userProducts.filter(p => p.isPurchased).length;
    const estimatedTotal = userProducts.reduce((sum, p) => {
      const price = p.price ? parseFloat(p.price) : 0;
      return sum + price;
    }, 0);

    return {
      totalItems,
      purchasedItems,
      estimatedTotal
    };
  }

  // Payment operations
  async addPayment(payment: {
    productId: number;
    paymentMethod: string;
    bank: string;
    installments: number;
    installmentValue: number;
    totalValue: number;
    purchaseDate: string;
    firstDueDate: string;
  }): Promise<number> {
    // Insere o pagamento
    const [createdPayment] = await db
      .insert(payments)
      .values({
        productId: payment.productId,
        paymentMethod: payment.paymentMethod,
        bank: payment.bank,
        installments: payment.installments,
        installmentValue: payment.installmentValue,
        totalValue: payment.totalValue,
        purchaseDate: payment.purchaseDate,
        firstDueDate: payment.firstDueDate,
      })
      .returning();

    // Cria as parcelas
    const installmentsData = [];
    const firstDueDate = new Date(payment.firstDueDate);
    
    for (let i = 0; i < payment.installments; i++) {
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      installmentsData.push({
        paymentId: createdPayment.id,
        installmentNumber: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        value: payment.installmentValue,
        isPaid: false,
        paidDate: null,
      });
    }

    if (installmentsData.length > 0) {
      await db.insert(installments).values(installmentsData);
    }

    return createdPayment.id;
  }

  async getUserPayments(userId: number): Promise<any[]> {
    const userPayments = await db
      .select({
        payment: payments,
        product: products,
      })
      .from(payments)
      .innerJoin(products, eq(payments.productId, products.id))
      .where(eq(products.userId, userId))
      .orderBy(payments.createdAt);

    return userPayments;
  }

  async getUserInstallments(userId: number): Promise<any[]> {
    const userInstallments = await db
      .select({
        installment: installments,
        payment: payments,
        product: products,
      })
      .from(installments)
      .innerJoin(payments, eq(installments.paymentId, payments.id))
      .innerJoin(products, eq(payments.productId, products.id))
      .where(eq(products.userId, userId))
      .orderBy(installments.dueDate);

    return userInstallments;
  }
}

export const storage = new DatabaseStorage();