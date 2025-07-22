import { users, products, payments, installments, finances, type SelectUser, type InsertUser, type SelectProduct, type InsertProduct } from "@shared/schema";
import { db, executeWithRetry } from "./db";
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

  // Payment-specific methods
  getPaymentByProductId(productId: number, userId: number): Promise<any | null>;
  updatePayment(
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
  ): Promise<boolean>;
    deletePaymentByProductId(productId: number, userId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<SelectUser | undefined> {
    return executeWithRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    });
  }

  async getUserByUsername(username: string): Promise<SelectUser | undefined> {
    return executeWithRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    });
  }

  async createUser(insertUser: InsertUser): Promise<SelectUser> {
    return executeWithRetry(async () => {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      return user;
    });
  }

  async getProducts(userId: number): Promise<SelectProduct[]> {
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

        return result.map(item => ({
          ...item,
          amount: parseFloat(item.amount),
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

  async getPaymentByProductId(productId: number, userId: number): Promise<any | null> {
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

export const storage = new DatabaseStorage();