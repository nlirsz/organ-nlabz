import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { extractProductInfo } from './gemini.js';

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

export async function scrapeProductFromUrl(url: string): Promise<ScrapedProduct> {
  let browser: Browser | null = null;

  try {
    console.log(`[Scraper] Iniciando scraping para: ${url}`);

    // Inicializa o navegador Chromium
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    // Cria contexto com User-Agent real
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'pt-BR'
    });

    const page = await context.newPage();

    // Bloqueia recursos desnecessários para acelerar
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Navega até a página
    console.log(`[Scraper] Navegando para: ${url}`);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Aguarda um pouco para JavaScript carregar conteúdo dinâmico
    await page.waitForTimeout(3000);

    // Extrai o HTML completo
    const html = await page.content();
    console.log(`[Scraper] HTML extraído com sucesso (${html.length} caracteres)`);

    // Processa o HTML para extrair informações do produto
    const productInfo = await extractProductInfo(url, html);

    console.log(`[Scraper] Produto extraído:`, productInfo);
    return productInfo;

  } catch (error) {
    console.error(`[Scraper] Erro ao fazer scraping:`, error);

    // Fallback: tenta criar produto básico a partir da URL
    const fallbackProduct = createFallbackProduct(url);
    console.log(`[Scraper] Usando produto fallback:`, fallbackProduct);
    return fallbackProduct;

  } finally {
    // Garante que o navegador sempre será fechado
    if (browser) {
      try {
        await browser.close();
        console.log(`[Scraper] Navegador fechado com sucesso`);
      } catch (error) {
        console.error(`[Scraper] Erro ao fechar navegador:`, error);
      }
    }
  }
}

function createFallbackProduct(url: string): ScrapedProduct {
  // Extrai o nome da loja a partir da URL
  let store = 'Loja Online';
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const storeMap: Record<string, string> = {
      'mercadolivre.com.br': 'Mercado Livre',
      'amazon.com.br': 'Amazon Brasil',
      'magazineluiza.com.br': 'Magazine Luiza',
      'americanas.com.br': 'Americanas',
      'submarino.com.br': 'Submarino',
      'casasbahia.com.br': 'Casas Bahia',
      'extra.com.br': 'Extra',
      'shopee.com.br': 'Shopee',
      'zara.com': 'Zara',
      'nike.com.br': 'Nike Brasil',
      'netshoes.com.br': 'Netshoes'
    };

    for (const [domain, name] of Object.entries(storeMap)) {
      if (hostname.includes(domain)) {
        store = name;
        break;
      }
    }

    if (store === 'Loja Online') {
      store = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    }
  } catch (error) {
    console.error('[Scraper] Erro ao extrair loja da URL:', error);
  }

  return {
    name: `Produto de ${store}`,
    price: null,
    originalPrice: null,
    imageUrl: 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Produto',
    store: store,
    description: 'Produto adicionado manualmente - informações não extraídas automaticamente',
    category: 'Outros',
    brand: null
  };
}

// Função auxiliar para extrair dados JSON-LD
export function extractJSONLD(html: string): Partial<ScrapedProduct> | null {
  try {
    console.log(`[JSON-LD] Tentando extrair dados estruturados...`);
    const $ = cheerio.load(html);

    // Procura por scripts JSON-LD
    const jsonLdScripts = $('script[type="application/ld+json"]');

    for (let i = 0; i < jsonLdScripts.length; i++) {
      const scriptContent = $(jsonLdScripts[i]).html();
      if (!scriptContent) continue;

      try {
        const jsonData = JSON.parse(scriptContent);
        const product = findProductInJsonLd(jsonData);

        if (product) {
          console.log(`[JSON-LD] Produto encontrado:`, product);
          return product;
        }
      } catch (parseError) {
        console.warn(`[JSON-LD] Erro ao parsear script ${i}:`, parseError);
        continue;
      }
    }

    console.log(`[JSON-LD] Nenhum produto encontrado em ${jsonLdScripts.length} scripts`);
    return null;
  } catch (error) {
    console.error(`[JSON-LD] Erro geral:`, error);
    return null;
  }
}

function findProductInJsonLd(data: any): Partial<ScrapedProduct> | null {
  // Se for um array, procura em cada item
  if (Array.isArray(data)) {
    for (const item of data) {
      const product = findProductInJsonLd(item);
      if (product) return product;
    }
    return null;
  }

  // Se for um objeto, verifica se é um produto
  if (data && typeof data === 'object') {
    // Produto direto
    if (data['@type'] === 'Product' || data.type === 'Product') {
      return extractProductFromJsonLd(data);
    }

    // Procura em propriedades aninhadas
    for (const key in data) {
      if (data[key] && typeof data[key] === 'object') {
        const product = findProductInJsonLd(data[key]);
        if (product) return product;
      }
    }
  }

  return null;
}

function extractProductFromJsonLd(productData: any): Partial<ScrapedProduct> | null {
  try {
    const name = productData.name || productData.title;
    if (!name) return null;

    // Extrai preço
    let price: number | null = null;
    let originalPrice: number | null = null;

    // Verifica várias estruturas de preço
    if (productData.offers) {
      const offer = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;
      if (offer.price) {
        price = parseFloat(offer.price);
      } else if (offer.priceSpecification?.price) {
        price = parseFloat(offer.priceSpecification.price);
      }

      // Preço original (se em promoção)
      if (offer.priceValidUntil && offer.originalPrice) {
        originalPrice = parseFloat(offer.originalPrice);
      }
    } else if (productData.price) {
      price = parseFloat(productData.price);
    }

    // Extrai imagem
    let imageUrl: string | null = null;
    if (productData.image) {
      if (typeof productData.image === 'string') {
        imageUrl = productData.image;
      } else if (Array.isArray(productData.image) && productData.image.length > 0) {
        imageUrl = typeof productData.image[0] === 'string' ? productData.image[0] : productData.image[0].url;
      } else if (productData.image.url) {
        imageUrl = productData.image.url;
      }
    }

    // Extrai outras informações
    const description = productData.description || null;
    const brand = productData.brand?.name || productData.brand || null;
    const category = productData.category || null;

    console.log(`[JSON-LD] Dados extraídos: ${name}, R$ ${price}`);

    return {
      name,
      price,
      originalPrice,
      imageUrl,
      description,
      brand,
      category
    };
  } catch (error) {
    console.error(`[JSON-LD] Erro ao extrair produto:`, error);
    return null;
  }
}