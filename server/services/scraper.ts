import { extractProductInfo, type ScrapedProduct } from "./gemini.js";
import { scrapingCache } from './cache';
import { priceHistoryService } from './priceHistory';
import { notificationService } from './notifications';

// Importa as funções do scrape-gemini para fallback
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const model = genAI?.getGenerativeModel({ model: "gemini-2.0-flash-experimental" });

const generationConfig = {
  temperature: 0.3,
  responseMimeType: "application/json",
};

function normalizePrice(price: any): number | null {
  if (typeof price === 'number') return price;
  if (typeof price !== 'string') return null;
  
  // Remove símbolos de moeda e espaços
  let priceStr = price.replace(/[R$\s]/g, '');
  
  // Para preços brasileiros (R$ 1.234,56), converte para formato americano
  if (priceStr.includes(',')) {
    // Se tem vírgula, assume formato brasileiro
    const parts = priceStr.split(',');
    if (parts.length === 2) {
      // Remove pontos como separadores de milhares
      const integerPart = parts[0].replace(/\./g, '');
      const decimalPart = parts[1];
      priceStr = `${integerPart}.${decimalPart}`;
    }
  }
  
  const priceNum = parseFloat(priceStr);
  return isNaN(priceNum) ? null : priceNum;
}

// MÉTODO 1: Analisa o HTML diretamente com Gemini
async function scrapeByAnalyzingHtml(productUrl: string): Promise<ScrapedProduct> {
  console.log(`[Gemini HTML Mode] Iniciando para: ${productUrl}`);
  
  const response = await fetch(productUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  
  if (!response.ok) {
    throw new Error(`Acesso bloqueado ao buscar HTML. Status: ${response.status}`);
  }
  
  const htmlContent = await response.text();

  const prompt = 'Analise o HTML a seguir para extrair os detalhes de um produto brasileiro.' +
    ' Retorne um objeto JSON com: "name", "price", "originalPrice", "imageUrl", "brand", "category", "description", "store".' +
    ' - Para "imageUrl", priorize a URL na meta tag \'og:image\' ou imagens de produto.' +
    ' - "price" deve ser um número (sem R$, sem pontos de milhares, use ponto para decimal).' +
    ' - "originalPrice" deve ser o preço original se houver desconto.' +
    ' - "store" deve ser o nome da loja extraído do domínio ou página.' +
    ' - "category" deve ser uma destas: Eletronicos, Roupas, Casa, Livros, Games, Presentes, Geral.' +
    ' HTML: ```html\n' + htmlContent.substring(0, 100000) + '\n```';
  
  const result = await model.generateContent({ 
    contents: [{ role: "user", parts: [{ text: prompt }] }], 
    generationConfig 
  });
  
  let jsonData = JSON.parse(result.response.text());
  
  if (jsonData && jsonData.price) {
    jsonData.price = normalizePrice(jsonData.price);
  }
  if (jsonData && jsonData.originalPrice) {
    jsonData.originalPrice = normalizePrice(jsonData.originalPrice);
  }
  
  return jsonData;
}

// MÉTODO 2: Busca inteligente com Gemini
async function scrapeBySearching(productUrl: string): Promise<ScrapedProduct> {
  console.log(`[Gemini Search Mode] Iniciando para: ${productUrl}`);

  const prompt = 'Encontre informações sobre o produto na URL: "' + productUrl + '".' +
    ' Retorne um objeto JSON com: "name", "price", "originalPrice", "imageUrl", "brand", "category", "description", "store".' +
    ' - Para "imageUrl", encontre uma URL de imagem pública e de alta resolução.' +
    ' - "price" deve ser um número (sem R$, sem pontos de milhares, use ponto para decimal).' +
    ' - "store" deve ser o nome da loja.' +
    ' - "category" deve ser uma destas: Eletronicos, Roupas, Casa, Livros, Games, Presentes, Geral.';
  
  const result = await model.generateContent({ 
    contents: [{ role: "user", parts: [{ text: prompt }] }], 
    generationConfig 
  });
  
  let jsonData = JSON.parse(result.response.text());

  if (jsonData && jsonData.price) {
    jsonData.price = normalizePrice(jsonData.price);
  }
  if (jsonData && jsonData.originalPrice) {
    jsonData.originalPrice = normalizePrice(jsonData.originalPrice);
  }

  return jsonData;
}

// MÉTODO 3: Fallback básico com informações mínimas
function createBasicFallback(url: string): ScrapedProduct {
  const domain = new URL(url).hostname;
  const storeName = domain.replace('www.', '').replace('.com.br', '').replace('.com', '');
  
  return {
    name: `Produto de ${storeName}`,
    price: null,
    originalPrice: null,
    imageUrl: null,
    store: storeName,
    description: `Produto extraído da URL: ${url}`,
    category: 'Geral',
    brand: null
  };
}

export async function scrapeProductFromUrl(url: string, productId?: number): Promise<ScrapedProduct> {
  console.log(`[Scraper] Iniciando scraping para: ${url}`);
  
  // Verifica cache primeiro
  const cacheKey = `scrape_${url}`;
  const cached = scrapingCache.get(cacheKey);
  if (cached) {
    console.log(`[Scraper] Retornando dados do cache para: ${url}`);
    return cached;
  }
  
  const errors: string[] = [];
  
  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!urlObj.protocol.startsWith('http')) {
      throw new Error('Invalid URL protocol');
    }

    // MÉTODO 1: Tenta scraping padrão com extractProductInfo
    try {
      console.log(`[Scraper] Tentando método padrão (extractProductInfo)`);
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

      if (response.ok) {
        const html = await response.text();
        
        if (html && html.length >= 100) {
          const productInfo = await extractProductInfo(url, html);
          
          // Adiciona ao cache (30 minutos)
          scrapingCache.set(cacheKey, productInfo, 30 * 60 * 1000);
          
          // Adiciona ao histórico de preços se necessário
          if (productId && productInfo.price) {
            const oldEntries = priceHistoryService.getPriceHistory(productId);
            const lastPrice = oldEntries.length > 0 ? oldEntries[oldEntries.length - 1].price : null;
            
            priceHistoryService.addPriceEntry(productId, productInfo.price, 'scraping');
            
            if (lastPrice && lastPrice !== productInfo.price) {
              notificationService.checkPriceChange(productId, lastPrice, productInfo.price);
            }
          }
          
          console.log(`[Scraper] Método padrão bem-sucedido: ${productInfo.name}`);
          return productInfo;
        }
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      errors.push(`Método padrão falhou: ${errorMsg}`);
      console.log(`[Scraper] Método padrão falhou: ${errorMsg}`);
    }

    // MÉTODO 2: Fallback com scrapeByAnalyzingHtml
    if (model) {
      try {
        console.log(`[Scraper] Tentando método fallback (HTML analysis)`);
        const productInfo = await scrapeByAnalyzingHtml(url);
        
        // Adiciona ao cache
        scrapingCache.set(cacheKey, productInfo, 30 * 60 * 1000);
        
        console.log(`[Scraper] Método HTML analysis bem-sucedido: ${productInfo.name}`);
        return productInfo;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        errors.push(`Método HTML analysis falhou: ${errorMsg}`);
        console.log(`[Scraper] Método HTML analysis falhou: ${errorMsg}`);
      }

      // MÉTODO 3: Fallback com scrapeBySearching
      try {
        console.log(`[Scraper] Tentando método fallback (AI search)`);
        const productInfo = await scrapeBySearching(url);
        
        // Adiciona ao cache
        scrapingCache.set(cacheKey, productInfo, 30 * 60 * 1000);
        
        console.log(`[Scraper] Método AI search bem-sucedido: ${productInfo.name}`);
        return productInfo;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        errors.push(`Método AI search falhou: ${errorMsg}`);
        console.log(`[Scraper] Método AI search falhou: ${errorMsg}`);
      }
    }

    // MÉTODO 4: Fallback básico - sempre retorna alguma coisa
    console.log(`[Scraper] Todos os métodos falharam, usando fallback básico`);
    const fallbackProduct = createBasicFallback(url);
    
    // Adiciona ao cache mesmo sendo fallback
    scrapingCache.set(cacheKey, fallbackProduct, 10 * 60 * 1000); // 10 minutos para fallback
    
    console.log(`[Scraper] Fallback básico criado: ${fallbackProduct.name}`);
    return fallbackProduct;
    
  } catch (error) {
    console.error("Scraping failed completely:", error);
    errors.push(`Erro geral: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    
    // Último recurso: retorna produto básico mesmo em caso de erro
    const fallbackProduct = createBasicFallback(url);
    console.log(`[Scraper] Retornando produto básico de último recurso`);
    return fallbackProduct;
  }
}
