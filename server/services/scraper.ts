import { extractProductInfo, type ScrapedProduct } from "./gemini.js";
import { scrapingCache } from './cache';
import { priceHistoryService } from './priceHistory';
import { notificationService } from './notifications';

export async function scrapeProductFromUrl(url: string, productId?: number): Promise<ScrapedProduct> {
  console.log(`[Scraper] Iniciando scraping para: ${url}`);
  
  // Verifica cache primeiro
  const cacheKey = `scrape_${url}`;
  const cached = scrapingCache.get(cacheKey);
  if (cached) {
    console.log(`[Scraper] Retornando dados do cache para: ${url}`);
    return cached;
  }
  
  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!urlObj.protocol.startsWith('http')) {
      throw new Error('Invalid URL protocol');
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    if (!html || html.length < 100) {
      throw new Error('Received empty or invalid HTML content');
    }

    // Use Gemini to extract product information
    const productInfo = await extractProductInfo(url, html);
    
    // Adiciona ao cache (30 minutos)
    scrapingCache.set(cacheKey, productInfo, 30 * 60 * 1000);
    
    // Se temos um productId, adiciona ao histórico de preços
    if (productId && productInfo.price) {
      const oldEntries = priceHistoryService.getPriceHistory(productId);
      const lastPrice = oldEntries.length > 0 ? oldEntries[oldEntries.length - 1].price : null;
      
      priceHistoryService.addPriceEntry(productId, productInfo.price, 'scraping');
      
      // Verifica se houve mudança de preço para notificações
      if (lastPrice && lastPrice !== productInfo.price) {
        notificationService.checkPriceChange(productId, lastPrice, productInfo.price);
      }
    }
    
    console.log(`[Scraper] Produto extraído: ${productInfo.name} - R$ ${productInfo.price}`);

    return productInfo;
  } catch (error) {
    console.error("Scraping failed:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to scrape product: ${error.message}`);
    }
    throw new Error('Failed to scrape product from URL');
  }
}
