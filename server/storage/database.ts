import { users, products, payments, installments, finances, type SelectUser, type InsertUser, type SelectProduct, type InsertProduct } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import type { IStorage } from "./interface";

// Dynamic imports to avoid top-level database dependency crashes
let dbModule: any = null;
let initialized = false;

async function getDbConnection() {
  if (!dbModule) {
    // Dynamic import to avoid top-level crash when DATABASE_URL is missing
    const { db, executeWithRetry } = await import("../db");
    dbModule = { db, executeWithRetry };
  }
  return dbModule;
}

export class DatabaseStorage implements IStorage {
  private async initializeDb() {
    if (!initialized) {
      await getDbConnection(); // Ensure db is loaded
      initialized = true;
    }
    return dbModule;
  }

  async getUser(id: number): Promise<SelectUser | undefined> {
    const { db, executeWithRetry } = await this.initializeDb();
    return executeWithRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    });
  }

  async getUserByUsername(username: string): Promise<SelectUser | undefined> {
    const { db, executeWithRetry } = await this.initializeDb();
    return executeWithRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    });
  }

  async createUser(insertUser: InsertUser): Promise<SelectUser> {
    const { db, executeWithRetry } = await this.initializeDb();
    return executeWithRetry(async () => {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      return user;
    });
  }

  async getProducts(userId: number): Promise<SelectProduct[]> {
    const { db, executeWithRetry } = await this.initializeDb();
    return executeWithRetry(async () => {
      const productList = await db
        .select()
        .from(products)
        .where(eq(products.userId, userId))
        .orderBy(products.createdAt);
      return productList;
    });
  }

  async getProduct(id: number, userId: number): Promise<SelectProduct | undefined> {
    const { db } = await this.initializeDb();
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.userId, userId)));
    return product || undefined;
  }

  async getProductById(id: number, userId: number): Promise<SelectProduct | undefined> {
    const { db } = await this.initializeDb();
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.userId, userId)));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<SelectProduct> {
    const { db } = await this.initializeDb();
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async updateProduct(id: number, updateProduct: Partial<InsertProduct>, userId: number): Promise<SelectProduct | undefined> {
    const { db } = await this.initializeDb();
    const [product] = await db
      .update(products)
      .set({ ...updateProduct, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.userId, userId)))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number, userId: number): Promise<boolean> {
    const { db, executeWithRetry } = await this.initializeDb();
    return executeWithRetry(async () => {
      console.log(`[Storage] Starting deleteProduct - ID: ${id}, UserId: ${userId}`);
      
      // First verify the product belongs to the user
      const product = await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(and(eq(products.id, id), eq(products.userId, userId)))
        .limit(1);

      if (product.length === 0) {
        console.log(`[Storage] Product ${id} not found or doesn't belong to user ${userId}`);
        return false;
      }

      console.log(`[Storage] Product found: ${product[0].name} (ID: ${id}), proceeding with cascade deletion`);

      // Get all payments for this product
      const productPayments = await db
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.productId, id));

      console.log(`[Storage] Found ${productPayments.length} payments to delete for product ${id}`);

      // Delete all installments for each payment
      let totalInstallmentsDeleted = 0;
      for (const payment of productPayments) {
        const deletedInstallments = await db
          .delete(installments)
          .where(eq(installments.payment_id, payment.id))
          .returning();
        totalInstallmentsDeleted += deletedInstallments.length;
      }

      console.log(`[Storage] Deleted ${totalInstallmentsDeleted} installments for product ${id}`);

      // Delete all payments for this product
      const deletedPayments = await db
        .delete(payments)
        .where(eq(payments.productId, id))
        .returning();

      console.log(`[Storage] Deleted ${deletedPayments.length} payments for product ${id}`);

      // Finally delete the product
      const result = await db
        .delete(products)
        .where(and(eq(products.id, id), eq(products.userId, userId)))
        .returning();

      const success = result.length > 0;
      console.log(`[Storage] Product deletion result: ${success ? 'SUCCESS' : 'FAILED'} - Deleted products: ${result.length}`);
      
      if (success) {
        console.log(`[Storage] ✅ Successfully deleted product ${id} (${product[0].name}) and all related data`);
      } else {
        console.error(`[Storage] ❌ Failed to delete product ${id} - no rows affected`);
      }

      return success;
    });
  }

  async getProductStats(userId: number): Promise<{
    totalItems: number;
    purchasedItems: number;
    estimatedTotal: number;
  }> {
    const { db } = await this.initializeDb();
    const userProducts = await db
      .select()
      .from(products)
      .where(eq(products.userId, userId));

    const totalItems = userProducts.length;
    const purchasedItems = userProducts.filter((p: SelectProduct) => p.isPurchased).length;
    const estimatedTotal = userProducts.reduce((sum: number, p: SelectProduct) => {
      const price = p.price ? Number(p.price) : 0;
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
    const { db } = await this.initializeDb();
    
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
        payment_id: createdPayment.id,
        installmentNumber: i + 1,
        dueDate: dueDate,
        value: payment.installmentValue.toString(),
        isPaid: false
      });
    }

    if (installmentsData.length > 0) {
      await db.insert(installments).values(installmentsData);
    }

    return createdPayment.id;
  }

  async getUserPayments(userId: number): Promise<any[]> {
    const { db } = await this.initializeDb();
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
    const { db, executeWithRetry } = await this.initializeDb();
    try {
      return await executeWithRetry(async () => {
        const result = await db
          .select({
            id: installments.id,
            productId: products.id,
            productName: products.name,
            installmentNumber: installments.installmentNumber,
            totalInstallments: payments.installments,
            amount: installments.value,
            dueDate: installments.dueDate,
            isPaid: installments.isPaid,
          })
          .from(installments)
          .innerJoin(payments, eq(installments.payment_id, payments.id))
          .innerJoin(products, eq(payments.productId, products.id))
          .where(eq(products.userId, userId))
          .orderBy(installments.dueDate);

        console.log(`[Storage] Parcelas encontradas para usuário ${userId}:`, result.length);

        return result.map((item: any) => ({
          ...item,
          amount: Number(item.amount),
          dueDate: typeof item.dueDate === 'string' ? item.dueDate : item.dueDate.toISOString(),
          month: typeof item.dueDate === 'string' ? new Date(item.dueDate).getMonth() + 1 : item.dueDate.getMonth() + 1,
          year: typeof item.dueDate === 'string' ? new Date(item.dueDate).getFullYear() : item.dueDate.getFullYear(),
          isPaid: item.isPaid || false,
        }));
      });
    } catch (error) {
      console.error("Error getting user installments:", error);
      return [];
    }
  }

  async getFinances(userId: number): Promise<any[]> {
    const { db } = await this.initializeDb();
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
    const { db } = await this.initializeDb();
    const [newFinance] = await db
      .insert(finances)
      .values({
        userId: financeData.userId,
        mes_ano: financeData.mes_ano,
        receita: financeData.receita.toString(),
        gastos: financeData.gastos.toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning({ id: finances.id });

    return newFinance.id;
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
    const { db } = await this.initializeDb();
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
    const { db } = await this.initializeDb();
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

  async getPaymentByProductId(productId: number, userId: number): Promise<any | null> {
    const { db } = await this.initializeDb();
    try {
      const result = await db
        .select({
          id: payments.id,
          paymentMethod: payments.paymentMethod,
          bank: payments.bank,
          installments: payments.installments,
          installmentValue: payments.installmentValue,
          totalValue: payments.totalValue,
          purchaseDate: payments.purchaseDate,
          firstDueDate: payments.firstDueDate,
        })
        .from(payments)
        .innerJoin(products, eq(payments.productId, products.id))
        .where(and(eq(payments.productId, productId), eq(products.userId, userId)))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Error getting payment by product ID:", error);
      return null;
    }
  }

  async updatePayment(
    paymentId: number,
    updates: {
      paymentMethod?: string;
      bank?: string;
      installments?: number;
      installmentValue?: number;
      totalValue?: number;
      purchaseDate?: string;
      firstDueDate?: string;
    },
    userId: number
  ): Promise<boolean> {
    const { db } = await this.initializeDb();
    try {
      // Primeiro verifica se o pagamento pertence ao usuário
      const paymentOwner = await db
        .select({ productId: payments.productId })
        .from(payments)
        .innerJoin(products, eq(payments.productId, products.id))
        .where(and(eq(payments.id, paymentId), eq(products.userId, userId)))
        .limit(1);

      if (paymentOwner.length === 0) {
        return false; // Pagamento não encontrado ou não pertence ao usuário
      }

      const [result] = await db
        .update(payments)
        .set(updates)
        .where(eq(payments.id, paymentId))
        .returning({ id: payments.id });

      // Se o número de parcelas mudou, recria as parcelas
      if (updates.installments && updates.firstDueDate) {
        // Remove parcelas antigas
        await db.delete(installments).where(eq(installments.payment_id, paymentId));

        // Cria novas parcelas
        const installmentsData = [];
        const firstDueDate = new Date(updates.firstDueDate);
        const installmentValue = updates.installmentValue || 0;

        for (let i = 0; i < updates.installments; i++) {
          const dueDate = new Date(firstDueDate);
          dueDate.setMonth(dueDate.getMonth() + i);

          installmentsData.push({
            payment_id: paymentId,
            installmentNumber: i + 1,
            dueDate: dueDate,
            value: installmentValue.toString(),
            isPaid: false
          });
        }

        if (installmentsData.length > 0) {
          await db.insert(installments).values(installmentsData);
        }
      }

      return !!result;
    } catch (error) {
      console.error("Error updating payment:", error);
      return false;
    }
  }

  async deletePaymentByProductId(productId: number, userId: number): Promise<boolean> {
    const { db } = await this.initializeDb();
    try {
      // Primeiro verifica se o produto pertence ao usuário
      const product = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.userId, userId)))
        .limit(1);

      if (product.length === 0) {
        return false; // Produto não encontrado ou não pertence ao usuário
      }

      // Busca o(s) pagamento(s) do produto
      const productPayments = await db
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.productId, productId));

      if (productPayments.length === 0) {
        return false; // Nenhum pagamento encontrado
      }

      // Remove as parcelas para cada pagamento
      for (const payment of productPayments) {
        await db
          .delete(installments)
          .where(eq(installments.payment_id, payment.id));
      }

      // Remove o(s) pagamento(s)
      const result = await db
        .delete(payments)
        .where(eq(payments.productId, productId))
        .returning({ id: payments.id });

      return result.length > 0;
    } catch (error) {
      console.error("Error deleting payment by product ID:", error);
      return false;
    }
  }
}