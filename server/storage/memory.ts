import type { SelectUser, InsertUser, SelectProduct, InsertProduct } from "@shared/schema";
import type { IStorage } from "./interface";

// MemStorage for development fallback when DATABASE_URL is not available
export class MemStorage implements IStorage {
  private users = new Map<number, SelectUser>();
  private products = new Map<number, SelectProduct>();
  private payments = new Map<number, any>();
  private installments = new Map<number, any>();
  private finances = new Map<number, any>();
  private nextUserId = 1;
  private nextProductId = 1;
  private nextPaymentId = 1;
  private nextInstallmentId = 1;
  private nextFinanceId = 1;

  constructor() {
    console.log('📝 Initializing MemStorage for development...');
    this.initializeMockData();
  }

  private initializeMockData() {
    // Create a default user for development
    const defaultUser: SelectUser = {
      id: 1,
      username: 'dev_user',
      password: '$2a$10$dummy.hash.for.development.testing', // bcrypt hash for 'password'
      createdAt: new Date()
    };
    this.users.set(1, defaultUser);
    this.nextUserId = 2;
    
    console.log('👤 Created default development user: dev_user (password: password)');
  }

  async getUser(id: number): Promise<SelectUser | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<SelectUser | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<SelectUser> {
    const newUser: SelectUser = {
      id: this.nextUserId++,
      username: insertUser.username,
      password: insertUser.password,
      createdAt: new Date()
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async getProducts(userId: number): Promise<SelectProduct[]> {
    const userProducts: SelectProduct[] = [];
    for (const product of Array.from(this.products.values())) {
      if (product.userId === userId) {
        userProducts.push(product);
      }
    }
    return userProducts.sort((a, b) => (a.createdAt || new Date()).getTime() - (b.createdAt || new Date()).getTime());
  }

  async getProduct(id: number, userId: number): Promise<SelectProduct | undefined> {
    const product = this.products.get(id);
    return product && product.userId === userId ? product : undefined;
  }

  async getProductById(id: number, userId: number): Promise<SelectProduct | undefined> {
    return this.getProduct(id, userId);
  }

  async createProduct(insertProduct: InsertProduct): Promise<SelectProduct> {
    const newProduct: SelectProduct = {
      ...insertProduct,
      id: this.nextProductId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Ensure undefined values are converted to null for schema compatibility
      brand: insertProduct.brand ?? null,
      price: insertProduct.price ?? null,
      originalPrice: insertProduct.originalPrice ?? null,
      imageUrl: insertProduct.imageUrl ?? null,
      store: insertProduct.store ?? null,
      description: insertProduct.description ?? null,
      category: insertProduct.category ?? null,
      tags: insertProduct.tags ?? null,
      priority: insertProduct.priority ?? null,
      notes: insertProduct.notes ?? null,
      isPurchased: insertProduct.isPurchased ?? false
    };
    this.products.set(newProduct.id, newProduct);
    console.log(`[MemStorage] Created product: ${newProduct.name} (ID: ${newProduct.id})`);
    return newProduct;
  }

  async updateProduct(id: number, updateProduct: Partial<InsertProduct>, userId: number): Promise<SelectProduct | undefined> {
    const product = this.products.get(id);
    if (!product || product.userId !== userId) {
      return undefined;
    }
    
    const updatedProduct: SelectProduct = {
      ...product,
      ...updateProduct,
      id: product.id, // Ensure ID doesn't change
      userId: product.userId, // Ensure userId doesn't change
      updatedAt: new Date()
    };
    
    this.products.set(id, updatedProduct);
    console.log(`[MemStorage] Updated product: ${updatedProduct.name} (ID: ${id})`);
    return updatedProduct;
  }

  async deleteProduct(id: number, userId: number): Promise<boolean> {
    console.log(`[MemStorage] Starting deleteProduct - ID: ${id}, UserId: ${userId}`);
    
    const product = this.products.get(id);
    if (!product || product.userId !== userId) {
      console.log(`[MemStorage] Product ${id} not found or doesn't belong to user ${userId}`);
      return false;
    }

    console.log(`[MemStorage] Product found: ${product.name} (ID: ${id}), proceeding with cascade deletion`);

    // Delete all payments and installments for this product
    const paymentsToDelete: number[] = [];
    for (const [paymentId, payment] of Array.from(this.payments.entries())) {
      if (payment.productId === id) {
        paymentsToDelete.push(paymentId);
      }
    }

    console.log(`[MemStorage] Found ${paymentsToDelete.length} payments to delete for product ${id}`);

    // Delete installments for each payment
    let totalInstallmentsDeleted = 0;
    for (const paymentId of paymentsToDelete) {
      const installmentsToDelete: number[] = [];
      for (const [installmentId, installment] of Array.from(this.installments.entries())) {
        if (installment.payment_id === paymentId) {
          installmentsToDelete.push(installmentId);
        }
      }
      for (const instId of installmentsToDelete) {
        if (this.installments.delete(instId)) {
          totalInstallmentsDeleted++;
        }
      }
    }

    console.log(`[MemStorage] Deleted ${totalInstallmentsDeleted} installments for product ${id}`);

    // Delete payments
    let deletedPayments = 0;
    for (const paymentId of paymentsToDelete) {
      if (this.payments.delete(paymentId)) {
        deletedPayments++;
      }
    }

    console.log(`[MemStorage] Deleted ${deletedPayments} payments for product ${id}`);

    // Finally delete the product
    const success = this.products.delete(id);
    
    if (success) {
      console.log(`[MemStorage] ✅ Successfully deleted product ${id} (${product.name}) and all related data`);
    } else {
      console.error(`[MemStorage] ❌ Failed to delete product ${id}`);
    }

    return success;
  }

  async getProductStats(userId: number): Promise<{
    totalItems: number;
    purchasedItems: number;
    estimatedTotal: number;
  }> {
    const userProducts = await this.getProducts(userId);
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
    const newPayment = {
      id: this.nextPaymentId++,
      productId: payment.productId,
      paymentMethod: payment.paymentMethod,
      bank: payment.bank,
      installments: payment.installments,
      installmentValue: payment.installmentValue,
      totalValue: payment.totalValue,
      purchaseDate: payment.purchaseDate,
      firstDueDate: payment.firstDueDate,
      createdAt: new Date()
    };
    
    this.payments.set(newPayment.id, newPayment);
    
    // Create installments
    const firstDueDate = new Date(payment.firstDueDate);
    for (let i = 0; i < payment.installments; i++) {
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      const installment = {
        id: this.nextInstallmentId++,
        payment_id: newPayment.id,
        installmentNumber: i + 1,
        dueDate: dueDate,
        value: payment.installmentValue.toString(),
        isPaid: false,
        paidAt: null,
        createdAt: new Date()
      };
      
      this.installments.set(installment.id, installment);
    }
    
    console.log(`[MemStorage] Created payment with ${payment.installments} installments for product ${payment.productId}`);
    return newPayment.id;
  }

  async getUserPayments(userId: number): Promise<any[]> {
    const userProducts = await this.getProducts(userId);
    const productIds = new Set(userProducts.map(p => p.id));
    
    const userPayments = [];
    for (const payment of Array.from(this.payments.values())) {
      if (productIds.has(payment.productId)) {
        const product = this.products.get(payment.productId);
        userPayments.push({
          payment,
          product
        });
      }
    }
    
    return userPayments.sort((a, b) => a.payment.createdAt - b.payment.createdAt);
  }

  async getUserInstallments(userId: number): Promise<any[]> {
    const userProducts = await this.getProducts(userId);
    const productIds = new Set(userProducts.map(p => p.id));
    
    const userInstallments = [];
    for (const installment of Array.from(this.installments.values())) {
      const payment = this.payments.get(installment.payment_id);
      if (payment && productIds.has(payment.productId)) {
        const product = this.products.get(payment.productId);
        userInstallments.push({
          id: installment.id,
          productId: payment.productId,
          productName: product?.name || 'Unknown Product',
          installmentNumber: installment.installmentNumber,
          totalInstallments: payment.installments,
          amount: parseFloat(installment.value),
          dueDate: installment.dueDate.toISOString(),
          isPaid: installment.isPaid || false,
          month: installment.dueDate.getMonth() + 1,
          year: installment.dueDate.getFullYear()
        });
      }
    }
    
    console.log(`[MemStorage] Parcelas encontradas para usuário ${userId}:`, userInstallments.length);
    return userInstallments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  async getFinances(userId: number): Promise<any[]> {
    const userFinances = [];
    for (const finance of Array.from(this.finances.values())) {
      if (finance.userId === userId) {
        userFinances.push(finance);
      }
    }
    return userFinances.sort((a, b) => b.mes_ano.localeCompare(a.mes_ano));
  }

  async addFinance(financeData: {
    userId: number;
    mes_ano: string;
    receita: number;
    gastos: number;
  }): Promise<number> {
    const newFinance = {
      id: this.nextFinanceId++,
      userId: financeData.userId,
      mes_ano: financeData.mes_ano,
      receita: financeData.receita.toString(),
      gastos: financeData.gastos.toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.finances.set(newFinance.id, newFinance);
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
    const finance = this.finances.get(financeId);
    if (!finance || finance.userId !== userId) {
      return false;
    }
    
    const updatedFinance = {
      ...finance,
      ...(updates.mes_ano && { mes_ano: updates.mes_ano }),
      ...(updates.receita !== undefined && { receita: updates.receita.toString() }),
      ...(updates.gastos !== undefined && { gastos: updates.gastos.toString() }),
      updatedAt: new Date()
    };
    
    this.finances.set(financeId, updatedFinance);
    return true;
  }

  async deleteFinance(financeId: number, userId: number): Promise<boolean> {
    const finance = this.finances.get(financeId);
    if (!finance || finance.userId !== userId) {
      return false;
    }
    return this.finances.delete(financeId);
  }

  async getPaymentByProductId(productId: number, userId: number): Promise<any | null> {
    const product = await this.getProduct(productId, userId);
    if (!product) {
      return null;
    }
    
    for (const payment of Array.from(this.payments.values())) {
      if (payment.productId === productId) {
        return {
          id: payment.id,
          paymentMethod: payment.paymentMethod,
          bank: payment.bank,
          installments: payment.installments,
          installmentValue: payment.installmentValue,
          totalValue: payment.totalValue,
          purchaseDate: payment.purchaseDate,
          firstDueDate: payment.firstDueDate
        };
      }
    }
    
    return null;
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
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return false;
    }
    
    // Verify ownership through product
    const product = this.products.get(payment.productId);
    if (!product || product.userId !== userId) {
      return false;
    }
    
    // Update payment
    const updatedPayment = { ...payment, ...updates };
    this.payments.set(paymentId, updatedPayment);
    
    // If installments changed, recreate them
    if (updates.installments && updates.firstDueDate) {
      // Remove old installments
      const oldInstallments = [];
      for (const [id, installment] of Array.from(this.installments.entries())) {
        if (installment.payment_id === paymentId) {
          oldInstallments.push(id);
        }
      }
      for (const id of oldInstallments) {
        this.installments.delete(id);
      }
      
      // Create new installments
      const firstDueDate = new Date(updates.firstDueDate);
      const installmentValue = updates.installmentValue || 0;
      
      for (let i = 0; i < updates.installments; i++) {
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        const installment = {
          id: this.nextInstallmentId++,
          payment_id: paymentId,
          installmentNumber: i + 1,
          dueDate: dueDate,
          value: installmentValue.toString(),
          isPaid: false,
          paidAt: null,
          createdAt: new Date()
        };
        
        this.installments.set(installment.id, installment);
      }
    }
    
    return true;
  }

  async deletePaymentByProductId(productId: number, userId: number): Promise<boolean> {
    const product = await this.getProduct(productId, userId);
    if (!product) {
      return false;
    }
    
    let deletedPayments = 0;
    
    const paymentsToDelete: number[] = [];
    for (const [paymentId, payment] of Array.from(this.payments.entries())) {
      if (payment.productId === productId) {
        paymentsToDelete.push(paymentId);
      }
    }
    
    for (const paymentId of paymentsToDelete) {
      // Delete installments for this payment
      const installmentsToDelete: number[] = [];
      for (const [installmentId, installment] of Array.from(this.installments.entries())) {
        if (installment.payment_id === paymentId) {
          installmentsToDelete.push(installmentId);
        }
      }
      for (const instId of installmentsToDelete) {
        this.installments.delete(instId);
      }
      
      // Delete the payment
      if (this.payments.delete(paymentId)) {
        deletedPayments++;
      }
    }
    
    return deletedPayments > 0;
  }
}