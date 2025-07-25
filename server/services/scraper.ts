import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { extractProductInfo } from './gemini.js';
import axios from 'axios';

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

// Configurações do navegador para Replit
const REPLIT_BROWSER_CONFIG = {
  timeouts: {
    playwright: 30000, // Timeout geral do Playwright (ms)
    waitForSelector: 5000, // Timeout para esperar por seletores (ms)
  },
  http: {
    timeout: 15000, // Timeout para requisições HTTP (ms)
    maxRedirects: 5, // Máximo de redirecionamentos
  },
  // Outras configurações...
};

export async function scrapeProductFromUrl(url: string): Promise<ScrapedProduct> {
  console.log(`[Scraper] 🚀 Iniciando scraping multi-estratégia para: ${url}`);

  // ESTRATÉGIA 1: Playwright (mais robusta)
  try {
    console.log(`[Scraper] 📱 TENTATIVA 1: Playwright com navegador real`);
    const playwrightResult = await scrapeWithPlaywright(url);
    if (playwrightResult && playwrightResult.name !== `Produto de ${playwrightResult.store}`) {
      console.log(`[Scraper] ✅ PLAYWRIGHT SUCESSO: "${playwrightResult.name}"`);
      return playwrightResult;
    }
  } catch (error) {
    console.warn(`[Scraper] ⚠️ Playwright falhou:`, error.message);
  }

  // ESTRATÉGIA 2: HTTP + Cheerio (mais leve)
  try {
    console.log(`[Scraper] 🌐 TENTATIVA 2: HTTP direto + Cheerio`);
    const httpResult = await scrapeWithHttp(url);
    if (httpResult && httpResult.name !== `Produto de ${httpResult.store}`) {
      console.log(`[Scraper] ✅ HTTP SUCESSO: "${httpResult.name}"`);
      return httpResult;
    }
  } catch (error) {
    console.warn(`[Scraper] ⚠️ HTTP falhou:`, error.message);
  }

  // ESTRATÉGIA 3: Fallback com informações básicas
  console.log(`[Scraper] 🔄 TODAS TENTATIVAS FALHARAM - Usando fallback`);
  return await createFallbackProduct(url);
}

async function scrapeWithPlaywright(url: string): Promise<ScrapedProduct> {
  let browser: Browser | null = null;

  try {
    // Inicializa o navegador com configurações otimizadas
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'pt-BR',
      ignoreHTTPSErrors: true
    });

    const page = await context.newPage();

    // Bloqueia recursos desnecessários
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media', 'websocket'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    console.log(`[Playwright] 🌐 Navegando para: ${url}`);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: REPLIT_BROWSER_CONFIG.timeouts.playwright 
    });

    // Aguarda conteúdo dinâmico carregar
    await page.waitForTimeout(3000);

    // Tenta aguardar elementos específicos
    try {
      await page.waitForSelector('h1, [data-testid*="title"], [class*="product"]', { 
        timeout: REPLIT_BROWSER_CONFIG.timeouts.waitForSelector 
      });
    } catch (e) {
      console.log(`[Playwright] ⚠️ Elementos não encontrados rapidamente, continuando...`);
    }

    const html = await page.content();
    console.log(`[Playwright] ✅ HTML capturado: ${Math.round(html.length / 1000)}KB`);

    return await extractProductInfo(url, html);

  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error(`[Playwright] ⚠️ Erro ao fechar navegador:`, error.message);
      }
    }
  }
}

async function scrapeWithHttp(url: string): Promise<ScrapedProduct> {
  try {
    console.log(`[HTTP] 🌐 Fazendo requisição HTTP para: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const html = response.data;
    console.log(`[HTTP] ✅ HTML recebido: ${Math.round(html.length / 1000)}KB`);

    return await extractProductInfo(url, html);

  } catch (error) {
    console.error(`[HTTP] ❌ Erro na requisição:`, error.message);
    throw error;
  }
}

async function createFallbackProduct(url: string): Promise<ScrapedProduct> {
  console.log(`[Fallback] 🔄 Criando produto fallback para: ${url}`);

  // Extrai informações básicas da URL
  let store = 'Loja Online';
  let productName = 'Produto';
  let category = 'Outros';

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    const pathname = urlObj.pathname;

    // Mapeia lojas conhecidas
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
      'netshoes.com.br': 'Netshoes',
      'kabum.com.br': 'KaBuM',
      'pichau.com.br': 'Pichau',
      'aliexpress.com': 'AliExpress',
      'shoptime.com.br': 'Shoptime'
    };

    // Identifica a loja
    for (const [domain, name] of Object.entries(storeMap)) {
      if (hostname.includes(domain)) {
        store = name;
        break;
      }
    }

    if (store === 'Loja Online') {
      const domainParts = hostname.split('.');
      store = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
    }

    // Tenta extrair nome do produto da URL
    const pathSegments = pathname.split('/').filter(segment => segment.length > 3);
    if (pathSegments.length > 0) {
      // Pega o último segmento significativo
      let productSlug = pathSegments[pathSegments.length - 1];

      // Remove códigos de produto comuns
      productSlug = productSlug.replace(/dp\/[A-Z0-9]+/i, '');
      productSlug = productSlug.replace(/\/p\/\d+/i, '');
      productSlug = productSlug.replace(/\?.*$/, '');

      // Converte slug em nome legível
      if (productSlug.length > 3) {
        productName = productSlug
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .substring(0, 50);
      }
    }

    // Detecta categoria básica pela URL
    const urlLower = url.toLowerCase();
    const categoryMap: Record<string, string> = {
      'celular': 'Eletrônicos',
      'smartphone': 'Eletrônicos', 
      'iphone': 'Eletrônicos',
      'notebook': 'Eletrônicos',
      'computador': 'Eletrônicos',
      'tenis': 'Roupas e Acessórios',
      'roupa': 'Roupas e Acessórios',
      'camisa': 'Roupas e Acessórios',
      'casa': 'Casa e Decoração',
      'movel': 'Casa e Decoração',
      'livro': 'Livros',
      'jogo': 'Games',
      'esporte': 'Esportes'
    };

    for (const [keyword, cat] of Object.entries(categoryMap)) {
      if (urlLower.includes(keyword)) {
        category = cat;
        break;
      }
    }

    // Aplica partner tag para Amazon na URL original
    let finalUrl = url;
    if (url.includes('amazon.com')) {
      try {
        const { addPartnerTagToAmazonUrl, extractASINFromUrl } = await import('./amazon-api.js');
        const asin = extractASINFromUrl(url);
        if (asin) {
          finalUrl = addPartnerTagToAmazonUrl(url, asin);
          console.log(`[Fallback] 🏷️ Partner tag aplicado: ${url} → ${finalUrl}`);
        }
      } catch (error) {
        console.warn(`[Fallback] ⚠️ Erro ao aplicar partner tag:`, error.message);
      }
    }

  } catch (error) {
    console.error('[Fallback] ❌ Erro ao processar URL:', error.message);
  }

  const fallbackProduct = {
    name: productName === 'Produto' ? `Produto de ${store}` : productName,
    price: null,
    originalPrice: null,
    imageUrl: 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Produto+Não+Encontrado',
    store: store,
    description: 'Produto adicionado automaticamente - informações precisam ser verificadas manualmente',
    category: category,
    brand: null,
    url: finalUrl // URL com partner tag aplicado se for Amazon
  };

  console.log(`[Fallback] 📦 Produto fallback criado:`, fallbackProduct);
  return fallbackProduct;
}

// Função auxiliar para extrair dados JSON-LD (mantida da versão anterior)
export function extractJSONLD(html: string): Partial<ScrapedProduct> | null {
  try {
    console.log(`[JSON-LD] 🔍 Procurando dados estruturados...`);
    const $ = cheerio.load(html);

    const jsonLdScripts = $('script[type="application/ld+json"]');
    console.log(`[JSON-LD] 📄 Encontrados ${jsonLdScripts.length} scripts JSON-LD`);

    for (let i = 0; i < jsonLdScripts.length; i++) {
      const scriptContent = $(jsonLdScripts[i]).html();
      if (!scriptContent) continue;

      try {
        const jsonData = JSON.parse(scriptContent);
        const product = findProductInJsonLd(jsonData);

        if (product?.name && product?.price) {
          console.log(`[JSON-LD] ✅ Produto encontrado no script ${i}:`, {
            name: product.name,
            price: product.price
          });
          return product;
        }
      } catch (parseError) {
        console.warn(`[JSON-LD] ⚠️ Erro ao parsear script ${i}:`, parseError.message);
        continue;
      }
    }

    console.log(`[JSON-LD] ❌ Nenhum produto válido encontrado`);
    return null;
  } catch (error) {
    console.error(`[JSON-LD] ❌ Erro geral:`, error.message);
    return null;
  }
}

function findProductInJsonLd(data: any): Partial<ScrapedProduct> | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      const product = findProductInJsonLd(item);
      if (product) return product;
    }
    return null;
  }

  if (data && typeof data === 'object') {
    if (data['@type'] === 'Product' || data.type === 'Product') {
      return extractProductFromJsonLd(data);
    }

    const relevantKeys = ['product', 'mainEntity', '@graph', 'offers', 'itemListElement'];
    for (const key of relevantKeys) {
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

    let price: number | null = null;
    let originalPrice: number | null = null;

    if (productData.offers) {
      const offer = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;

      if (offer.price) {
        price = parseFloat(String(offer.price).replace(',', '.'));
      } else if (offer.priceSpecification?.price) {
        price = parseFloat(String(offer.priceSpecification.price).replace(',', '.'));
      } else if (offer.lowPrice) {
        price = parseFloat(String(offer.lowPrice).replace(',', '.'));
      }

      if (offer.highPrice && offer.highPrice !== price) {
        originalPrice = parseFloat(String(offer.highPrice).replace(',', '.'));
      }
    } else if (productData.price) {
      price = parseFloat(String(productData.price).replace(',', '.'));
    }

    let imageUrl: string | null = null;
    if (productData.image) {
      if (typeof productData.image === 'string') {
        imageUrl = productData.image;
      } else if (Array.isArray(productData.image) && productData.image.length > 0) {
        const img = productData.image[0];
        imageUrl = typeof img === 'string' ? img : img.url;
      } else if (productData.image.url) {
        imageUrl = productData.image.url;
      }
    }

    const description = productData.description || null;
    const brand = productData.brand?.name || productData.brand || null;
    const category = productData.category || productData.productCategory || null;

    console.log(`[JSON-LD] 📊 Dados extraídos: "${name}", R$ ${price}`);

    return {
      name: String(name).trim(),
      price: price && !isNaN(price) ? price : null,
      originalPrice: originalPrice && !isNaN(originalPrice) ? originalPrice : null,
      imageUrl: imageUrl && imageUrl.startsWith('http') ? imageUrl : null,
      description: description ? String(description).trim() : null,
      brand: brand ? String(brand).trim() : null,
      category: category ? String(category).trim() : null
    };
  } catch (error) {
    console.error(`[JSON-LD] ❌ Erro ao extrair produto:`, error.message);
    return null;
  }
}