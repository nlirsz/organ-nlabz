import type { SelectUser, InsertUser, SelectProduct, InsertProduct } from "@shared/schema";

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