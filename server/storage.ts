import { users, products, payments, installments, finances, type SelectUser, type InsertUser, type SelectProduct, type InsertProduct } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<SelectUser | undefined>;
  getUserByUsername(username: string): Promise<SelectUser | undefined>;
  createUser(user: InsertUser): Promise<SelectUser>;

  // Product operations
  getProducts(userId: number): Promise<SelectProduct[]>;
  getProduct(id: number, userId: number): Promise<SelectProduct | undefined>;
  getProductById(id: number, userId: number): Promise<SelectProduct | undefined>;
  createProduct(product: InsertProduct): Promise<SelectProduct>;
  updateProduct(id: number, product: Partial<InsertProduct>, userId: number): Promise<SelectProduct | undefined>;
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

  getFinances(userId: number): Promise<any[]>;
  addFinance(financeData: {
    userId: number;
    mes_ano: string;
    receita: number;
    gastos: number;
  }): Promise<number>;
  updateFinance(
    financeId: number,
    updates: {
      mes_ano?: string;
      receita?: number;
      gastos?: number;
    },
    userId: number
  ): Promise<boolean>;
  deleteFinance(financeId: number, userId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<SelectUser | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<SelectUser | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<SelectUser> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getProducts(userId: number): Promise<SelectProduct[]> {
    const productList = await db
      .select()
      .from(products)
      .where(eq(products.userId, userId))
      .orderBy(products.createdAt);
    return productList;
  }

  async getProduct(id: number, userId: number): Promise<SelectProduct | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.userId, userId)));
    return product || undefined;
  }

  async getProductById(id: number, userId: number): Promise<SelectProduct | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.userId, userId)));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<SelectProduct> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async updateProduct(id: number, updateProduct: Partial<InsertProduct>, userId: number): Promise<SelectProduct | undefined> {
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
        dueDate: dueDate, // Usar objeto Date diretamente
        amount: payment.installmentValue.toString(),
        status: 'pending',
        paidAt: null,
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
    try {
      // Implementação placeholder - aqui você pode buscar as parcelas específicas do usuário
      return [];
    } catch (error) {
      console.error("Error getting user installments:", error);
      return [];
    }
  }

  async getFinances(userId: number): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(finances)
        .where(eq(finances.userId, userId))
        .orderBy(desc(finances.mes_ano));

      return result;
    } catch (error) {
      console.error("Error getting finances:", error);
      return [];
    }
  }

  async addFinance(financeData: {
    userId: number;
    mes_ano: string;
    receita: number;
    gastos: number;
  }): Promise<number> {
    try {
      const [result] = await db
        .insert(finances)
        .values({
          userId: financeData.userId,
          mes_ano: financeData.mes_ano,
          receita: financeData.receita.toString(),
          gastos: financeData.gastos.toString(),
          updatedAt: new Date()
        })
        .returning({ id: finances.id });

      return result.id;
    } catch (error) {
      console.error("Error adding finance record:", error);
      throw error;
    }
  }

  async updateFinance(
    financeId: number,
    updates: {
      mes_ano?: string;
      receita?: number;
      gastos?: number;
    },
    userId: number
  ): Promise<boolean> {
    try {
      const [result] = await db
        .update(finances)
        .set({
          ...(updates.mes_ano && { mes_ano: updates.mes_ano }),
          ...(updates.receita !== undefined && { receita: updates.receita.toString() }),
          ...(updates.gastos !== undefined && { gastos: updates.gastos.toString() }),
          updatedAt: new Date()
        })
        .where(and(eq(finances.id, financeId), eq(finances.userId, userId)))
        .returning({ id: finances.id });

      return !!result;
    } catch (error) {
      console.error("Error updating finance record:", error);
      return false;
    }
  }

  async deleteFinance(financeId: number, userId: number): Promise<boolean> {
    try {
      const [result] = await db
        .delete(finances)
        .where(and(eq(finances.id, financeId), eq(finances.userId, userId)))
        .returning({ id: finances.id });

      return !!result;
    } catch (error) {
      console.error("Error deleting finance record:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();