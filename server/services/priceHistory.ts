// Histórico de preços para rastrear variações
export interface PriceHistoryEntry {
  productId: number;
  price: number;
  timestamp: number;
  source: string;
}

class PriceHistoryService {
  private history: Map<number, PriceHistoryEntry[]> = new Map();

  addPriceEntry(productId: number, price: number, source: string = 'scraping'): void {
    if (!this.history.has(productId)) {
      this.history.set(productId, []);
    }

    const entries = this.history.get(productId)!;
    const lastEntry = entries[entries.length - 1];

    // Só adiciona se o preço mudou
    if (!lastEntry || lastEntry.price !== price) {
      entries.push({
        productId,
        price,
        timestamp: Date.now(),
        source
      });

      // Mantém apenas os últimos 100 registros por produto
      if (entries.length > 100) {
        entries.shift();
      }
    }
  }

  getPriceHistory(productId: number): PriceHistoryEntry[] {
    return this.history.get(productId) || [];
  }

  getLowestPrice(productId: number): number | null {
    const entries = this.getPriceHistory(productId);
    if (entries.length === 0) return null;

    return Math.min(...entries.map(e => e.price));
  }

  getHighestPrice(productId: number): number | null {
    const entries = this.getPriceHistory(productId);
    if (entries.length === 0) return null;

    return Math.max(...entries.map(e => e.price));
  }

  getPriceVariation(productId: number): { percentage: number; trend: 'up' | 'down' | 'stable' } {
    const entries = this.getPriceHistory(productId);
    if (entries.length < 2) return { percentage: 0, trend: 'stable' };

    const currentPrice = entries[entries.length - 1].price;
    const previousPrice = entries[entries.length - 2].price;

    const percentage = ((currentPrice - previousPrice) / previousPrice) * 100;
    let trend: 'up' | 'down' | 'stable' = 'stable';

    if (percentage > 1) trend = 'up';
    else if (percentage < -1) trend = 'down';

    return { percentage: Math.abs(percentage), trend };
  }

  getRecentPriceChanges(productId: number, hoursAgo: number = 24): PriceHistoryEntry[] {
    const entries = this.getPriceHistory(productId);
    const cutoff = Date.now() - (hoursAgo * 60 * 60 * 1000);

    return entries.filter(entry => entry.timestamp > cutoff);
  }
}

export const priceHistoryService = new PriceHistoryService();