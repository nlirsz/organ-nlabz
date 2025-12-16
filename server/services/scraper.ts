import * as cheerio from 'cheerio';
import { extractProductInfo } from './gemini.js';
import { isShopeeUrl, addShopeeAffiliateParams } from './shopee-api.js';
import { isAliExpressUrl, addAliExpressAffiliateParams } from './aliexpress-api.js';
import { anyCrawlService } from './anycrawl.js';
import { anyCrawlWrapper } from './api-wrapper.js';
import { extractStoreFromUrl, isDifficultSite, extractCategoryFromUrl } from '../utils/store-mapping.js';
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

// Configurações HTTP otimizadas
const HTTP_CONFIG = {
  timeout: 15000, // 15s timeout
  maxRedirects: 5,
};

export async function scrapeProductFromUrl(url: string): Promise<ScrapedProduct> {
  console.log(`[Scraper] 🚀 Iniciando scraping multi-estratégia para: ${url}`);

  // VERIFICAÇÃO ESPECÍFICA: Se for Shopee, converte URL para afiliado
  let processedUrl = url;
  if (isShopeeUrl(url)) {
    processedUrl = addShopeeAffiliateParams(url);
    console.log(`[Scraper] 🛍️ URL da Shopee convertida para afiliado: ${url} → ${processedUrl}`);
  }

  // VERIFICAÇÃO ESPECÍFICA: Se for AliExpress, converte URL para afiliado
  if (isAliExpressUrl(url)) {
    processedUrl = addAliExpressAffiliateParams(url);
    console.log(`[Scraper] 🛒 URL da AliExpress convertida para afiliado: ${url} → ${processedUrl}`);
  }

  // ESTRATÉGIA 1: HTTP + Cheerio (método principal)

  let httpFailed = false;
  try {
    console.log(`[Scraper] 🌐 TENTATIVA 1: HTTP direto + Cheerio`);
    const httpResult = await scrapeWithHttp(processedUrl);

    // Valida se obteve dados reais (nome específico E pelo menos preço OU imagem válida)
    const hasValidName = httpResult?.name &&
      httpResult.name !== 'Produto encontrado' &&
      httpResult.name !== `Produto de ${httpResult.store}` &&
      httpResult.name.length >= 3; // Aceita nomes curtos como "PS5", "SSD"

    const hasPrice = httpResult?.price && httpResult.price > 0;

    // Valida imagem: aceita URLs absolutas, protocol-relative (//cdn.example.com) e relativas
    const hasValidImage = httpResult?.imageUrl &&
      !httpResult.imageUrl.includes('placeholder') &&
      (httpResult.imageUrl.startsWith('http') ||
        httpResult.imageUrl.startsWith('//') ||
        httpResult.imageUrl.startsWith('/'));

    // Considera sucesso se tem nome válido E (preço OU imagem)
    if (httpResult && hasValidName && (hasPrice || hasValidImage)) {
      console.log(`[Scraper] ✅ HTTP SUCESSO: "${httpResult.name}" - Preço: ${hasPrice ? 'R$ ' + httpResult.price : 'N/A'}, Imagem: ${hasValidImage ? 'OK' : 'N/A'}`);
      return httpResult;
    } else {
      console.log(`[Scraper] ⚠️ HTTP retornou dados incompletos:`, {
        name: httpResult?.name,
        hasValidName,
        hasPrice,
        hasValidImage,
        imageUrl: httpResult?.imageUrl
      });
      httpFailed = true;
    }
  } catch (error: any) {
    console.warn(`[Scraper] ⚠️ HTTP falhou:`, error.message);
    httpFailed = true;
  }

  // ESTRATÉGIA 3: AnyCrawl Premium (SEMPRE usado quando HTTP falha)
  const isAnyCrawlAvailable = anyCrawlService.isAvailable();

  if (httpFailed) {
    if (!isAnyCrawlAvailable) {
      console.log(`[Scraper] ⚠️ AnyCrawl não disponível (API Key: ${process.env.ANYCRAWL_API_KEY ? 'OK' : 'AUSENTE'}, Conectividade: FALHOU)`);
      console.log(`[Scraper] 💡 Verifique: 1) API Key nos Secrets, 2) Conectividade de rede do Replit`);
    }
  }

  if (isAnyCrawlAvailable && httpFailed) {
    try {
      console.log(`[Scraper] 💎 TENTATIVA 2: AnyCrawl Premium (HTTP falhou - usando fallback)`);
      console.log(`[Scraper] 💰 AVISO: Esta operação consumirá créditos AnyCrawl`);

      // USA O WRAPPER COM RATE LIMITING
      const anyCrawlResult = await anyCrawlWrapper.scrapeUrl(processedUrl, {
        extractMetadata: true,
        screenshot: false,
        waitFor: 'networkidle',
        timeout: 30000,
        priority: 'normal'
      });

      if (anyCrawlResult && anyCrawlResult.success) {
        // Extrai informações do resultado do AnyCrawl
        let productResult: ScrapedProduct;

        if (anyCrawlResult.data.metadata) {
          // Usa metadata primeiro
          const metadata = anyCrawlResult.data.metadata;
          productResult = {
            name: metadata.title || 'Produto AnyCrawl',
            price: metadata.price ? parseFloat(String(metadata.price).replace(/[^\d,.-]/g, '').replace(',', '.')) || null : null,
            imageUrl: metadata.image || null,
            store: extractStoreFromUrl(processedUrl),
            description: metadata.description || null,
            category: null,
            brand: null
          };
        } else if (anyCrawlResult.data.html) {
          // Usa HTML + Gemini
          productResult = await extractProductInfo(processedUrl, anyCrawlResult.data.html);
        } else {
          throw new Error('AnyCrawl não retornou dados úteis');
        }

        if (productResult && productResult.name !== `Produto de ${productResult.store}`) {
          console.log(`[Scraper] ✅ ANYCRAWL SUCESSO: "${productResult.name}"`);
          return productResult;
        }
      }
    } catch (error: any) {
      console.warn(`[Scraper] ⚠️ AnyCrawl wrapper falhou:`, error.message);
    }
  } else if (!isAnyCrawlAvailable) {
    console.log(`[Scraper] 📴 AnyCrawl não disponível - API Key não configurada`);
  } else {
    console.log(`[Scraper] 💰 Site normal e HTTP funcionou - economizando créditos`);
  }

  // ESTRATÉGIA 4: Fallback com informações básicas
  console.log(`[Scraper] 🔄 TODAS TENTATIVAS FALHARAM - Usando fallback`);
  return await createFallbackProduct(processedUrl);
}


async function scrapeWithHttp(url: string): Promise<ScrapedProduct> {
  try {
    console.log(`[HTTP] 🌐 Fazendo requisição HTTP para: ${url}`);

    // User agents rotativos para evitar bloqueios
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
    ];

    // Configuração base com timeout otimizado
    let axiosConfig: any = {
      headers: {
        'User-Agent': userAgents[0],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 25000, // 25 segundos (balanceado)
      maxRedirects: 10
    };

    // Para AliExpress, adiciona headers específicos e múltiplas tentativas
    if (isAliExpressUrl(url)) {
      console.log(`[HTTP] 🛒 Configurando para AliExpress...`);
      axiosConfig.headers['Referer'] = 'https://www.aliexpress.com/';
      axiosConfig.headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
      axiosConfig.headers['sec-ch-ua-mobile'] = '?0';
      axiosConfig.headers['sec-ch-ua-platform'] = '"Windows"';
      axiosConfig.headers['Cache-Control'] = 'no-cache';
      axiosConfig.headers['Pragma'] = 'no-cache';
      axiosConfig.timeout = 35000; // 35s para AliExpress (sites complexos)
      axiosConfig.maxRedirects = 25; // Mais redirecionamentos (AliExpress usa muitos)
      axiosConfig.validateStatus = (status: number) => status < 500; // Aceita 3xx e 4xx

      // Múltiplas tentativas para AliExpress
      let lastError: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[HTTP] 🛒 Tentativa ${attempt}/3 para AliExpress`);

          axiosConfig.headers['User-Agent'] = userAgents[attempt - 1];

          const response = await axios.get(url, axiosConfig);
          const html = response.data;

          console.log(`[HTTP] ✅ HTML recebido na tentativa ${attempt}: ${Math.round(html.length / 1000)}KB`);

          // Verifica se o HTML contém dados de produto real
          if (html.length > 5000 && (html.includes('product') || html.includes('item') || html.includes('runParams'))) {
            console.log(`[HTTP] 🛒 HTML válido detectado na tentativa ${attempt}`);
            return await extractProductInfo(url, html);
          } else {
            console.log(`[HTTP] 🛒 HTML insuficiente na tentativa ${attempt}, tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Delay progressivo
            continue;
          }

        } catch (error: any) {
          lastError = error;
          console.warn(`[HTTP] 🛒 Tentativa ${attempt} falhou:`, error.message);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 3000 * attempt)); // Delay progressivo
          }
        }
      }

      if (lastError) throw lastError;
    }

    // Para outros sites: também usa retry com user agents rotativos
    let lastError: any;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[HTTP] 🌐 Tentativa ${attempt}/2 para ${new URL(url).hostname}`);

        // Rotaciona user agent
        axiosConfig.headers['User-Agent'] = userAgents[attempt - 1];

        const response = await axios.get(url, axiosConfig);
        const html = response.data;

        console.log(`[HTTP] ✅ HTML recebido na tentativa ${attempt}: ${Math.round(html.length / 1000)}KB`);

        // Verifica se HTML tem conteúdo mínimo
        if (html.length > 1000) {
          return await extractProductInfo(url, html);
        } else {
          console.warn(`[HTTP] ⚠️ HTML muito pequeno (${html.length} chars), tentando novamente...`);
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }

      } catch (error: any) {
        lastError = error;
        console.warn(`[HTTP] ⚠️ Tentativa ${attempt} falhou:`, error.message);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s antes de retry
        }
      }
    }

    if (lastError) throw lastError;
    throw new Error('Falha em todas as tentativas de requisição HTTP');

  } catch (error: any) {
    console.error(`[HTTP] ❌ Erro na requisição:`, error.message);
    if (error.code === 'ECONNABORTED') {
      console.error(`[HTTP] ⏰ Timeout na requisição`);
    } else if (error.response?.status) {
      console.error(`[HTTP] 📡 Status HTTP: ${error.response.status}`);
    } else if (error.message.includes('redirects')) {
      console.error(`[HTTP] 🔄 Muitos redirecionamentos`);
    }
    throw error;
  }
}

async function createFallbackProduct(url: string): Promise<ScrapedProduct> {
  console.log(`[Fallback] 🔄 Criando produto fallback para: ${url}`);

  // Usa funções centralizadas
  const store = extractStoreFromUrl(url);
  const category = extractCategoryFromUrl(url);
  let productName = 'Produto';

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Tenta extrair nome do produto da URL
    const pathSegments = pathname.split('/').filter(segment => segment.length > 3);
    if (pathSegments.length > 0) {
      // Pega o último segmento significativo
      let productSlug = pathSegments[pathSegments.length - 1];

      // Remove extensão e códigos de produto comuns
      productSlug = productSlug.split('.html')[0];
      productSlug = productSlug.split('?')[0];
      productSlug = productSlug.replace(/dp\/[A-Z0-9]+/i, '');
      productSlug = productSlug.replace(/\/p\/\d+/i, '');
      productSlug = productSlug.replace(/[-_]?p\d{6,}$/i, ''); // Zara: -p07545715
      productSlug = productSlug.replace(/[-_]?sku[-_]?\w+$/i, ''); // SKU codes
      productSlug = productSlug.replace(/[-_]?\d{6,}$/i, ''); // Números longos

      // Converte slug em nome legível
      if (productSlug.length > 3) {
        productName = productSlug
          .split('-')
          .filter(word => word.length > 1)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
          .substring(0, 80);
      }
    }

  } catch (error: any) {
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
    url: url // URL com partner tag aplicado se for Amazon
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
      } catch (parseError: any) {
        console.warn(`[JSON-LD] ⚠️ Erro ao parsear script ${i}:`, parseError.message);
        continue;
      }
    }

    console.log(`[JSON-LD] ❌ Nenhum produto válido encontrado`);
    return null;
  } catch (error: any) {
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
  } catch (error: any) {
    console.error(`[JSON-LD] ❌ Erro ao extrair produto:`, error.message);
    return null;
  }
}