
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
    console.log(`[Scraper] 🚀 Iniciando scraping para: ${url}`);

    // Inicializa o navegador Chromium com configurações otimizadas
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    // Cria contexto com User-Agent real e configurações de navegador
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'pt-BR',
      ignoreHTTPSErrors: true
    });

    const page = await context.newPage();

    // Bloqueia recursos desnecessários para acelerar carregamento
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media', 'websocket'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Navega até a página com timeouts otimizados
    console.log(`[Scraper] 🌐 Navegando para: ${url}`);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });

    // Aguarda conteúdo dinâmico carregar
    console.log(`[Scraper] ⏳ Aguardando carregamento do conteúdo dinâmico...`);
    await page.waitForTimeout(4000);

    // Tenta aguardar elementos específicos aparecerem
    try {
      await page.waitForSelector('h1, [class*="title"], [class*="name"]', { timeout: 5000 });
    } catch (e) {
      console.log(`[Scraper] ⚠️ Headers não encontrados, continuando...`);
    }

    // Extrai o HTML completo
    const html = await page.content();
    console.log(`[Scraper] ✅ HTML extraído com sucesso (${Math.round(html.length / 1000)}KB)`);

    // Processa o HTML usando a estratégia hierárquica em gemini.ts
    const productInfo = await extractProductInfo(url, html);

    console.log(`[Scraper] 🎯 Produto extraído:`, {
      name: productInfo.name,
      price: productInfo.price,
      store: productInfo.store,
      hasImage: !!productInfo.imageUrl
    });

    return productInfo;

  } catch (error) {
    console.error(`[Scraper] ❌ Erro durante scraping:`, error.message);

    // Fallback: tenta criar produto básico a partir da URL
    const fallbackProduct = createFallbackProduct(url);
    console.log(`[Scraper] 🔄 Usando produto fallback:`, fallbackProduct);
    return fallbackProduct;

  } finally {
    // Garante que o navegador sempre será fechado
    if (browser) {
      try {
        await browser.close();
        console.log(`[Scraper] 🔒 Navegador fechado com sucesso`);
      } catch (error) {
        console.error(`[Scraper] ⚠️ Erro ao fechar navegador:`, error.message);
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
      'netshoes.com.br': 'Netshoes',
      'kabum.com.br': 'KaBuM',
      'pichau.com.br': 'Pichau'
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
    imageUrl: 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Produto+Não+Encontrado',
    store: store,
    description: 'Produto adicionado via fallback - informações não puderam ser extraídas automaticamente',
    category: 'Outros',
    brand: null
  };
}

// Função auxiliar para extrair dados JSON-LD
export function extractJSONLD(html: string): Partial<ScrapedProduct> | null {
  try {
    console.log(`[JSON-LD] 🔍 Procurando dados estruturados...`);
    const $ = cheerio.load(html);

    // Procura por scripts JSON-LD
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

    console.log(`[JSON-LD] ❌ Nenhum produto válido encontrado nos ${jsonLdScripts.length} scripts`);
    return null;
  } catch (error) {
    console.error(`[JSON-LD] ❌ Erro geral:`, error.message);
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

    // Extrai preço com lógica robusta
    let price: number | null = null;
    let originalPrice: number | null = null;

    // Verifica várias estruturas de preço
    if (productData.offers) {
      const offer = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;
      
      // Preço atual
      if (offer.price) {
        price = parseFloat(String(offer.price).replace(',', '.'));
      } else if (offer.priceSpecification?.price) {
        price = parseFloat(String(offer.priceSpecification.price).replace(',', '.'));
      } else if (offer.lowPrice) {
        price = parseFloat(String(offer.lowPrice).replace(',', '.'));
      }

      // Preço original (se em promoção)
      if (offer.highPrice && offer.highPrice !== price) {
        originalPrice = parseFloat(String(offer.highPrice).replace(',', '.'));
      }
    } else if (productData.price) {
      price = parseFloat(String(productData.price).replace(',', '.'));
    }

    // Extrai imagem com prioridade
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

    // Extrai outras informações
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
