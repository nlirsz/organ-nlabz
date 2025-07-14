// Sistema de notificações para mudanças de preço
export interface NotificationRule {
  userId: number;
  productId: number;
  type: 'price_drop' | 'price_rise' | 'back_in_stock';
  threshold?: number; // Percentual de mudança
  active: boolean;
}

export interface Notification {
  id: string;
  userId: number;
  productId: number;
  type: 'price_drop' | 'price_rise' | 'back_in_stock';
  message: string;
  oldPrice?: number;
  newPrice?: number;
  timestamp: number;
  read: boolean;
}

class NotificationService {
  private rules: Map<string, NotificationRule> = new Map();
  private notifications: Map<number, Notification[]> = new Map();
  private notificationId = 1;

  addRule(rule: NotificationRule): void {
    const key = `${rule.userId}_${rule.productId}_${rule.type}`;
    this.rules.set(key, rule);
  }

  removeRule(userId: number, productId: number, type: string): void {
    const key = `${userId}_${productId}_${type}`;
    this.rules.delete(key);
  }

  getUserRules(userId: number): NotificationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.userId === userId);
  }

  checkPriceChange(productId: number, oldPrice: number, newPrice: number): void {
    const relevantRules = Array.from(this.rules.values()).filter(
      rule => rule.productId === productId && rule.active
    );

    for (const rule of relevantRules) {
      if (rule.type === 'price_drop' && newPrice < oldPrice) {
        const dropPercentage = ((oldPrice - newPrice) / oldPrice) * 100;
        if (!rule.threshold || dropPercentage >= rule.threshold) {
          this.createNotification({
            userId: rule.userId,
            productId: productId,
            type: 'price_drop',
            message: `Preço baixou ${dropPercentage.toFixed(1)}%! De R$ ${oldPrice.toFixed(2)} para R$ ${newPrice.toFixed(2)}`,
            oldPrice,
            newPrice
          });
        }
      } else if (rule.type === 'price_rise' && newPrice > oldPrice) {
        const risePercentage = ((newPrice - oldPrice) / oldPrice) * 100;
        if (!rule.threshold || risePercentage >= rule.threshold) {
          this.createNotification({
            userId: rule.userId,
            productId: productId,
            type: 'price_rise',
            message: `Preço subiu ${risePercentage.toFixed(1)}%! De R$ ${oldPrice.toFixed(2)} para R$ ${newPrice.toFixed(2)}`,
            oldPrice,
            newPrice
          });
        }
      }
    }
  }

  private createNotification(data: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const notification: Notification = {
      ...data,
      id: (this.notificationId++).toString(),
      timestamp: Date.now(),
      read: false
    };

    if (!this.notifications.has(data.userId)) {
      this.notifications.set(data.userId, []);
    }

    const userNotifications = this.notifications.get(data.userId)!;
    userNotifications.unshift(notification);

    // Mantém apenas as últimas 50 notificações por usuário
    if (userNotifications.length > 50) {
      userNotifications.pop();
    }

    console.log(`[Notification] ${notification.message} para usuário ${data.userId}`);
  }

  getUserNotifications(userId: number): Notification[] {
    return this.notifications.get(userId) || [];
  }

  markAsRead(userId: number, notificationId: string): void {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  getUnreadCount(userId: number): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }

  clearOldNotifications(userId: number, olderThanDays: number = 30): void {
    const userNotifications = this.notifications.get(userId) || [];
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    const filtered = userNotifications.filter(n => n.timestamp > cutoff);
    this.notifications.set(userId, filtered);
  }
}

export const notificationService = new NotificationService();