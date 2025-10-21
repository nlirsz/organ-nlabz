
import axios from 'axios';

interface AnyCrawlResponse {
  success: boolean;
  data: {
    html?: string;
    screenshot?: string;
    metadata?: {
      title?: string;
      description?: string;
      price?: string;
      image?: string;
    };
  };
  error?: string;
  credits_used: number;
}

interface ScrapedProduct {
  name: string;
  price: number | null;
  originalPrice?: number | null;
  imageUrl: string | null;
  store: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
}

class AnyCrawlService {
  private apiKey: string;
  private baseUrl = 'https://api.anycrawl.com/v1';

  constructor() {
    this.apiKey = process.env.ANYCRAWL_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[AnyCrawl] ⚠️ API Key não configurada - serviço desabilitado');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async scrapeProduct(url: string): Promise<ScrapedProduct | null> {
    if (!this.isAvailable()) {
      console.log('[AnyCrawl] ❌ Serviço não disponível - API Key ausente');
      return null;
    }

    try {
      console.log(`[AnyCrawl] 🚀 Iniciando scraping premium para: ${url}`);
      console.log(`[AnyCrawl] 💰 IMPORTANTE: Esta operação consumirá créditos AnyCrawl`);

      const response = await axios.post(`${this.baseUrl}/crawl`, {
        url: url,
        extract_metadata: true,
        screenshot: false, // Economiza créditos
        wait_for: 'networkidle', // Aguarda conteúdo dinâmico
        timeout: 30000
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      });

      const result: AnyCrawlResponse = response.data;
      
      if (!result.success) {
        console.error('[AnyCrawl] ❌ Falha no scraping:', result.error);
        console.error('[AnyCrawl] 💸 Créditos consumidos mesmo com falha');
        return null;
      }

      console.log(`[AnyCrawl] ✅ Scraping concluído`);
      console.log(`[AnyCrawl] 💰 Créditos usados: ${result.credits_used || 'N/A'}`);
      console.log(`[AnyCrawl] 📊 Status: ${result.status || 'N/A'}`);

      // Extrai dados do metadata primeiro
      if (result.data.metadata) {
        const metadata = result.data.metadata;
        const product = this.extractFromMetadata(metadata, url);
        if (product && product.name && product.name !== `Produto de ${product.store}`) {
          console.log(`[AnyCrawl] 📊 Dados extraídos via metadata: "${product.name}"`);
          return product;
        }
      }

      // Se metadata não for suficiente, usa HTML + Gemini
      if (result.data.html) {
        console.log(`[AnyCrawl] 🔍 Processando HTML com Gemini...`);
        const { extractProductInfo } = await import('./gemini.js');
        const product = await extractProductInfo(url, result.data.html);
        if (product && product.name && product.name !== `Produto de ${product.store}`) {
          console.log(`[AnyCrawl] 🤖 Dados extraídos via Gemini: "${product.name}"`);
          return product;
        }
      }

      console.log('[AnyCrawl] ⚠️ Nenhum produto válido extraído');
      return null;

    } catch (error) {
      console.error('[AnyCrawl] ❌ Erro na requisição:', error.message);
      
      if (error.response?.status === 402) {
        console.error('[AnyCrawl] 💳 Créditos insuficientes');
      } else if (error.response?.status === 401) {
        console.error('[AnyCrawl] 🔐 API Key inválida');
      }
      
      return null;
    }
  }

  private extractFromMetadata(metadata: any, url: string): ScrapedProduct | null {
    try {
      const name = metadata.title || null;
      if (!name || name.length < 3) return null;

      // Extrai preço do metadata
      let price: number | null = null;
      if (metadata.price) {
        const priceStr = String(metadata.price).replace(/[^\d,.-]/g, '');
        const priceNum = parseFloat(priceStr.replace(',', '.'));
        if (!isNaN(priceNum) && priceNum > 0) {
          price = priceNum;
        }
      }

      // Identifica loja pela URL
      const store = this.identifyStore(url);

      return {
        name: name.trim(),
        price: price,
        imageUrl: metadata.image || null,
        store: store,
        description: metadata.description || null,
        category: null,
        brand: null
      };

    } catch (error) {
      console.error('[AnyCrawl] ❌ Erro ao extrair metadata:', error.message);
      return null;
    }
  }

  private identifyStore(url: string): string {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      
      const storeMap: Record<string, string> = {
        'mercadolivre.com.br': 'Mercado Livre',
        'amazon.com.br': 'Amazon Brasil',
        'magazineluiza.com.br': 'Magazine Luiza',
        'americanas.com.br': 'Americanas',
        'submarino.com.br': 'Submarino',
        'casasbahia.com.br': 'Casas Bahia',
        'shopee.com.br': 'Shopee',
        'aliexpress.com': 'AliExpress',
        'kabum.com.br': 'KaBuM',
        'pichau.com.br': 'Pichau'
      };

      for (const [domain, name] of Object.entries(storeMap)) {
        if (hostname.includes(domain)) {
          return name;
        }
      }

      // Fallback: capitaliza o domínio
      const domainParts = hostname.split('.');
      return domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);

    } catch (error) {
      return 'Loja Online';
    }
  }

  async checkCredits(): Promise<number | null> {
    if (!this.isAvailable()) return null;

    try {
      const response = await axios.get(`${this.baseUrl}/credits`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data.remaining_credits || 0;
    } catch (error) {
      console.error('[AnyCrawl] ❌ Erro ao verificar créditos:', error.message);
      return null;
    }
  }
}

export const anyCrawlService = new AnyCrawlService();
