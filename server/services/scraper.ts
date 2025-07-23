
import { extractProductInfo, type ScrapedProduct } from "./gemini.js";
import { scrapingCache } from './cache';
import { priceHistoryService } from './priceHistory';
import { notificationService } from './notifications';
import { tryAPIFirst, fetchFromGoogleShopping, type APIProductResult } from './ecommerce-apis';

// Importa as funções do scrape-gemini para fallback
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const model = genAI?.getGenerativeModel({ model: "gemini-1.5-flash" });

const generationConfig = {
  temperature: 0.2,
  responseMimeType: "application/json",
};

function normalizePrice(price: any): number | null {
  if (typeof price === 'number') return price;
  if (typeof price !== 'string') return null;
  
  // Remove símbolos de moeda e espaços
  let priceStr = price.replace(/[R$€£¥\s]/g, '');
  
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

// Lista de User-Agents rotativos para evitar detecção
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// Headers mais completos para parecer navegador real
function getRandomHeaders(url: string) {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const domain = new URL(url).hostname;
  
  // Headers específicos por site
  const siteSpecificHeaders: Record<string, Record<string, string>> = {
    'mercadolivre.com.br': {
      'X-Requested-With': 'XMLHttpRequest',
      'X-ML-Device': 'desktop'
    },
    'amazon.com.br': {
      'X-Requested-With': 'XMLHttpRequest',
      'Device-Memory': '8',
      'Downlink': '10'
    },
    'americanas.com.br': {
      'X-Requested-With': 'XMLHttpRequest'
    }
  };
  
  const baseHeaders = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8,en-US;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': 'https://www.google.com/',
    // Simula características de navegador real
    'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"Windows"',
    'Viewport-Width': '1920'
  };
  
  // Adiciona headers específicos do site
  const specificHeaders = Object.keys(siteSpecificHeaders).find(key => domain.includes(key));
  if (specificHeaders) {
    Object.assign(baseHeaders, siteSpecificHeaders[specificHeaders]);
  }
  
  return baseHeaders;
}

// Sistema de delays por domínio
const domainDelays = new Map<string, number>();

function getDelayForDomain(domain: string): number {
  const baseDelay = 1000; // 1 segundo base
  const lastRequest = domainDelays.get(domain) || 0;
  const timeSinceLastRequest = Date.now() - lastRequest;
  
  // Se passou menos de 3 segundos, aguarda mais
  if (timeSinceLastRequest < 3000) {
    return 3000 - timeSinceLastRequest;
  }
  
  return Math.random() * 1000 + baseDelay; // Entre 1-2 segundos
}

// Função para tentar múltiplas estratégias de fetch
async function robustFetch(url: string, maxRetries = 3): Promise<Response> {
  const domain = new URL(url).hostname;
  const delay = getDelayForDomain(domain);
  
  if (delay > 0) {
    console.log(`[Fetch] Aguardando ${delay}ms para evitar rate limiting...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  domainDelays.set(domain, Date.now());
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Fetch] Tentativa ${attempt}/${maxRetries} para: ${url}`);
      
      const headers = getRandomHeaders(url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        redirect: 'follow',
        method: 'GET'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`[Fetch] ✅ Sucesso na tentativa ${attempt}: ${response.status}`);
        return response;
      }
      
      // Se recebeu 403/429, aguarda antes de tentar novamente
      if (response.status === 403 || response.status === 429) {
        const waitTime = attempt * 2000; // 2s, 4s, 6s
        console.log(`[Fetch] Status ${response.status}, aguardando ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Erro desconhecido');
      console.log(`[Fetch] ❌ Tentativa ${attempt} falhou: ${lastError.message}`);
      
      // Se não é a última tentativa, aguarda antes de tentar novamente
      if (attempt < maxRetries) {
        const waitTime = attempt * 1000; // 1s, 2s
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError || new Error('Todas as tentativas de fetch falharam');
}

// MÉTODO 1: Analisa o HTML diretamente com Gemini
async function scrapeByAnalyzingHtml(productUrl: string): Promise<ScrapedProduct> {
  console.log(`[Gemini HTML Mode] Iniciando para: ${productUrl}`);
  
  const response = await robustFetch(productUrl);
  const htmlContent = await response.text();

  const domain = new URL(productUrl).hostname;
  const isKnownSite = getKnownSiteConfig(domain);
  
  const prompt = `Analise esta página de e-commerce para extrair informações de produto.

URL: ${productUrl}
Domínio: ${domain}
${isKnownSite ? `Site conhecido: ${isKnownSite.name} - ${isKnownSite.hints}` : ''}

${domain.includes('zara.com') ? `
⚠️ INSTRUÇÕES CRÍTICAS PARA ZARA:

NOME DO PRODUTO:
- Procure por: <h1>, title, meta[property="og:title"]
- Limpe: remove promoções, códigos, medidas extras
- Exemplo: "SUNRISE ON THE RED SAND DUNES INTENSE EDP 100 ML (3.38 FL. OZ.)"

PREÇO (OBRIGATÓRIO):
- Procure primeiro pelo preço em EUR (€)
- Elementos possíveis: .money-amount, .price, [data-qa-anchor*="price"]
- JSON-LD: @type="Product" → "offers" → "price"
- Meta: meta[property="product:price:amount"]
- CONVERSÃO: EUR → BRL (multiplique por 6.2)
- Exemplo: "89,95 €" = 89.95 * 6.2 = 557.69

IMAGEM (OBRIGATÓRIA):
- PRIORIDADE 1: meta[property="og:image"] - verificar se URL é válida
- PRIORIDADE 2: meta[name="twitter:image"]
- PRIORIDADE 3: img[src*="static.zara.net/assets/public"] (URLs modernas)
- PRIORIDADE 4: img[src*="static.zara.net"] mas evite URLs com "/photos///"
- VALIDAÇÃO: Rejeite URLs que contenham "/photos///" (barras triplas)
- VALIDAÇÃO: Prefira URLs com "/assets/public/" e parâmetros "&w=1500"
- Deve ser URL completa, acessível e sem barras duplas/triplas
` : ''}

INSTRUÇÕES ESPECÍFICAS PARA PREÇOS:
${getSpecificPriceInstructions(domain)}

INSTRUÇÕES ESPECÍFICAS PARA IMAGENS:
${getSpecificImageInstructions(domain)}

REGRAS GERAIS:
- "name": Título limpo do produto (remova promoções/ofertas)
- "price": Número decimal (ex: 1299.99) - preço atual de venda
- "originalPrice": Preço original se houver desconto
- "imageUrl": URL completa da imagem principal do produto
- "store": Nome da loja
- "category": Eletrônicos, Roupas, Casa, Livros, Games, Automotivo, Esportes, Outros
- "brand": Marca do produto

HTML (primeiros 100k caracteres):
\`\`\`html
${htmlContent.substring(0, 100000)}
\`\`\`

Retorne JSON válido:`;

function getKnownSiteConfig(domain: string) {
  const configs: Record<string, { name: string; hints: string }> = {
    'nike.com.br': { 
      name: 'Nike Brasil', 
      hints: 'Preços em .price-current, imagens em meta og:image' 
    },
    'zara.com': { 
      name: 'Zara', 
      hints: 'Preços em .price__amount, imagens grandes em .media-image' 
    },
    'mercadolivre.com.br': { 
      name: 'Mercado Livre', 
      hints: 'Preço em .price-tag-fraction, imagem em meta og:image' 
    },
    'americanas.com.br': { 
      name: 'Americanas', 
      hints: 'Preço em .price-value, imagem principal em meta og:image' 
    },
    'magazineluiza.com.br': { 
      name: 'Magazine Luiza', 
      hints: 'Preço em [data-testid="price-value"], imagem em meta og:image' 
    },
    'dafiti.com.br': {
      name: 'Dafiti',
      hints: 'Preço em .price-value, imagem em meta og:image'
    },
    'netshoes.com.br': {
      name: 'Netshoes',
      hints: 'Preço em .price, imagem principal'
    }
  };
  
  for (const [key, config] of Object.entries(configs)) {
    if (domain.includes(key)) return config;
  }
  return null;
}

function getSpecificPriceInstructions(domain: string): string {
  if (domain.includes('nike.com')) {
    return '- Procure por classes: .price-current, .product-price, .price-reduced\n- Ignore preços de parcelamento';
  }
  if (domain.includes('zara.com')) {
    return `- PRIORIDADE 1: Encontre o preço em EUR primeiro
- Procure por elementos com texto que contenha "€" seguido de números
- Exemplos: "89,95 €", "89.95 €", "€89.95"
- Classes possíveis: .money-amount, .price, [data-qa-anchor="product.price.current"]
- JSON-LD: procure por @type="Product" e "offers" com "price" e "priceCurrency"
- Meta tags: meta[property="product:price:amount"] e meta[property="product:price:currency"]
- CONVERSÃO OBRIGATÓRIA: Para EUR → BRL, multiplique por 6.2
- Exemplo: se encontrar "89,95 €", retorne: 89.95 * 6.2 = 557.69
- Ignore valores de frete, taxas, ou preços muito baixos (< 10 EUR)`;
  }
  if (domain.includes('mercadolivre.com')) {
    return '- Procure por: .price-tag-fraction, .price-tag-cents\n- Combine fração + centavos';
  }
  if (domain.includes('dafiti.com') || domain.includes('netshoes.com')) {
    return '- Procure por: .price, .price-value, .product-price\n- Ignore preços parcelados';
  }
  return '- Procure elementos com classes: price, valor, preco, cost\n- Ignore preços de frete e parcelamento';
}

function getSpecificImageInstructions(domain: string): string {
  if (domain.includes('nike.com')) {
    return '- PRIORIDADE 1: meta[property="og:image"] - URL exata como "copiar link da imagem"\n- PRIORIDADE 2: img[data-qa="product-image"] - URL direta sem modificações';
  }
  if (domain.includes('amazon.com')) {
    return `- PRIORIDADE 1: meta[property="og:image"] - URL EXATA (simula copiar link da imagem)
- PRIORIDADE 2: img[data-a-dynamic-image] - primeira URL da lista sem modificações
- PRIORIDADE 3: img[src*="images-amazon.com"] ou img[src*="m.media-amazon.com"] - URL direta
- PRIORIDADE 4: JSON-LD "image" - URL original sem alterações

FILOSOFIA: Copiar link da imagem do navegador
- MANTENHA URL original: não altere _AC_SX679_, _AC_SL1500_, etc.
- PREFIRA URLs com resolução boa mas MANTENHA como está
- NÃO adicione ou remova parâmetros
- URL deve funcionar diretamente no navegador`;
  }
  if (domain.includes('zara.com')) {
    return `- PRIORIDADE 1: meta[property="og:image"] - URL EXATA como copiar link
- PRIORIDADE 2: meta[name="twitter:image"] - URL original
- PRIORIDADE 3: JSON-LD "image" - URL sem modificações
- PRIORIDADE 4: picture source - URL de maior resolução original
- PRIORIDADE 5: img[src*="static.zara.net"] - URL direta como encontrada

FILOSOFIA: Simula botão direito > copiar link da imagem
- MANTENHA URL exatamente como encontrada
- NÃO remova parâmetros como "&w=1500" se presentes
- EVITE URLs com "/photos///" mas MANTENHA estrutura original`;
  }
  if (domain.includes('mercadolivre.com')) {
    return `- PRIORIDADE 1: meta[property="og:image"] - URL EXATA como copiar link da imagem
- PRIORIDADE 2: meta[name="twitter:image"] - URL original sem alterações
- PRIORIDADE 3: img[src*="mlstatic.com"] - URL direta da galeria principal
- PRIORIDADE 4: picture source - URL de maior resolução original

FILOSOFIA: Simula exatamente "copiar link da imagem" do navegador
- MANTENHA URL original: -O.jpg, -W.jpg, _2X permanecem como estão
- NÃO converta .webp aqui (será feito depois se necessário)
- NÃO modifique -I para -O aqui (preserva original)
- IGNORE URLs com parâmetros temporários (?timestamp, &cache)
- URL deve carregar diretamente como link da imagem`;
  }
  if (domain.includes('dafiti.com') || domain.includes('netshoes.com')) {
    return '- PRIORIDADE 1: meta[property="og:image"] - URL exata como copiar link\n- PRIORIDADE 2: .product-image img - URL original sem modificações';
  }
  return '- PRIORIDADE 1: meta[property="og:image"] - URL exata como botão direito > copiar link\n- PRIORIDADE 2: img de produto - URL direta sem alterações';
}
  
  if (!model) {
    throw new Error('Modelo Gemini não disponível');
  }

  const result = await model.generateContent({ 
    contents: [{ role: "user", parts: [{ text: prompt }] }], 
    generationConfig 
  });
  
  let responseText = result.response.text();
  
  // Limpa markdown se presente
  if (responseText.includes('```')) {
    responseText = responseText.replace(/```json\s*|\s*```/g, '');
  }
  
  let jsonData = JSON.parse(responseText);
  
  if (jsonData && jsonData.price) {
    jsonData.price = normalizePrice(jsonData.price);
  }
  if (jsonData && jsonData.originalPrice) {
    jsonData.originalPrice = normalizePrice(jsonData.originalPrice);
  }
  
  // Corrige store se vazio
  if (!jsonData.store) {
    jsonData.store = getStoreNameFromDomain(domain);
  }
  
  return jsonData;
}

// MÉTODO 2: Busca inteligente com Gemini
async function scrapeBySearching(productUrl: string): Promise<ScrapedProduct> {
  console.log(`[Gemini Search Mode] Iniciando para: ${productUrl}`);

  if (!model) {
    throw new Error('Modelo Gemini não disponível');
  }

  const prompt = `Encontre informações detalhadas sobre o produto na URL: "${productUrl}".

INSTRUÇÕES ESPECÍFICAS:
- Use suas ferramentas de busca para encontrar dados atualizados
- Para preços em moedas estrangeiras, converta para BRL
- Foque no produto específico, não em categorias ou listas

Retorne um objeto JSON com:
{
  "name": "Nome exato do produto",
  "price": 3899.99,
  "originalPrice": null,
  "imageUrl": "https://images.site.com/produto-hd.jpg",
  "store": "Nome da Loja",
  "description": "Descrição técnica",
  "category": "Categoria específica",
  "brand": "Marca do produto"
}

Categorias válidas: Eletrônicos, Roupas, Casa, Livros, Games, Automotivo, Esportes, Outros`;
  
  const result = await model.generateContent({ 
    contents: [{ role: "user", parts: [{ text: prompt }] }], 
    generationConfig 
  });
  
  let responseText = result.response.text();
  
  // Limpa markdown se presente
  if (responseText.includes('```')) {
    responseText = responseText.replace(/```json\s*|\s*```/g, '');
  }
  
  let jsonData = JSON.parse(responseText);

  if (jsonData && jsonData.price) {
    jsonData.price = normalizePrice(jsonData.price);
  }
  if (jsonData && jsonData.originalPrice) {
    jsonData.originalPrice = normalizePrice(jsonData.originalPrice);
  }

  return jsonData;
}

// MÉTODO 3: Fallback básico com informações mais inteligentes
function createBasicFallback(url: string): ScrapedProduct {
  const urlObj = new URL(url);
  const domain = urlObj.hostname;
  const pathname = urlObj.pathname;
  
  // Extrai informações mais inteligentes da URL
  const storeName = getStoreNameFromDomain(domain);
  const productName = extractProductNameFromUrl(pathname, domain);
  const category = guessCategory(pathname, domain);
  
  return {
    name: productName,
    price: null,
    originalPrice: null,
    imageUrl: `https://via.placeholder.com/400x400/e0e5ec/6c757d?text=${encodeURIComponent(storeName)}`,
    store: storeName,
    description: `Produto encontrado em: ${storeName}. Adicione manualmente o preço e outros detalhes.`,
    category: category,
    brand: null
  };
}

function getStoreNameFromDomain(domain: string): string {
  const storeMap: Record<string, string> = {
    'nike.com.br': 'Nike Brasil',
    'zara.com': 'Zara',
    'mercadolivre.com.br': 'Mercado Livre',
    'americanas.com.br': 'Americanas',
    'magazineluiza.com.br': 'Magazine Luiza',
    'casasbahia.com.br': 'Casas Bahia',
    'extra.com.br': 'Extra',
    'submarino.com.br': 'Submarino',
    'amazon.com.br': 'Amazon Brasil',
    'netshoes.com.br': 'Netshoes',
    'dafiti.com.br': 'Dafiti',
    'homenge.com.br': 'Homenge',
    'cockpitextremeracing.com.br': 'Extreme SimRacing'
  };
  
  for (const [key, name] of Object.entries(storeMap)) {
    if (domain.includes(key)) return name;
  }
  
  // Fallback: capitaliza primeira palavra do domínio
  const baseDomain = domain.replace('www.', '').split('.')[0];
  return baseDomain.charAt(0).toUpperCase() + baseDomain.slice(1);
}

function extractProductNameFromUrl(pathname: string, domain: string): string {
  // Lógica específica para Zara
  if (domain.includes('zara.com')) {
    // Extrai o nome do produto da URL da Zara
    // Exemplo: /sunrise-on-the-red-sand-dunes-intense-edp-100-ml--3-38-fl--oz--p20220319.html
    const cleanPath = pathname.replace(/--p\d+\.html.*$/, ''); // Remove código do produto
    const cleanPath2 = cleanPath.replace(/^\/[^\/]*\/[^\/]*\//, ''); // Remove idioma/país
    
    // Remove medidas e códigos técnicos comuns
    const cleanPath3 = cleanPath2.replace(/--\d+-\d+.*$/, ''); // Remove --3-38-fl--oz
    const cleanPath4 = cleanPath3.replace(/-\d+\s*ml/gi, ''); // Remove -100-ml
    
    const segments = cleanPath4.split('-').filter(s => s.length > 1);
    
    if (segments.length > 0) {
      return segments
        .slice(0, 10) // Aumenta para capturar nome completo
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
    }
  }
  
  // Remove extensões e divide por separadores
  const cleanPath = pathname.replace(/\.[^/.]+$/, '');
  const segments = cleanPath.split(/[\/\-_]/).filter(s => s.length > 2);
  
  if (segments.length === 0) {
    return `Produto de ${getStoreNameFromDomain(domain)}`;
  }
  
  // Pega os segmentos mais descritivos (evita 'produto', 'item', etc)
  const descriptiveSegments = segments.filter(s => 
    !['produto', 'item', 'p', 'products', 'pd'].includes(s.toLowerCase())
  );
  
  if (descriptiveSegments.length > 0) {
    return descriptiveSegments
      .slice(0, 4) // Máximo 4 palavras
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }
  
  return `Produto de ${getStoreNameFromDomain(domain)}`;
}

function guessCategory(pathname: string, domain: string): string {
  const path = pathname.toLowerCase();
  
  const categoryMap = [
    { keywords: ['tenis', 'sapato', 'calcado', 'shoes', 'sneaker'], category: 'Roupas' },
    { keywords: ['roupa', 'camisa', 'calca', 'vestido', 'clothing'], category: 'Roupas' },
    { keywords: ['perfume', 'fragrance', 'cologne', 'edp', 'edt'], category: 'Outros' },
    { keywords: ['eletronic', 'celular', 'notebook', 'tv', 'smartphone'], category: 'Eletrônicos' },
    { keywords: ['game', 'console', 'playstation', 'xbox', 'nintendo'], category: 'Games' },
    { keywords: ['casa', 'decoracao', 'movel', 'furniture', 'home'], category: 'Casa' },
    { keywords: ['livro', 'book', 'revista'], category: 'Livros' },
    { keywords: ['esporte', 'fitness', 'sport'], category: 'Esportes' },
    { keywords: ['carro', 'auto', 'moto', 'automotive'], category: 'Automotivo' }
  ];
  
  for (const { keywords, category } of categoryMap) {
    if (keywords.some(keyword => path.includes(keyword))) {
      return category;
    }
  }
  
  // Categoria por domínio
  if (domain.includes('nike.com') || domain.includes('adidas.com') || domain.includes('dafiti.com')) return 'Roupas';
  if (domain.includes('americanas.com') || domain.includes('submarino.com')) return 'Eletrônicos';
  if (domain.includes('zara.com')) return 'Roupas';
  
  return 'Outros';
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
  
  // ESTRATÉGIA 1: Tenta Google Shopping API primeiro (mais confiável)
  try {
    console.log(`[Scraper] Tentando Google Shopping API primeiro...`);
    const googleResults = await fetchFromGoogleShopping(url);
    
    if (googleResults && googleResults.length > 0) {
      const bestResult = googleResults.find(r => r.price && r.price > 0) || googleResults[0];
      
      if (bestResult && (bestResult.price > 0 || bestResult.name !== 'Produto encontrado')) {
        console.log(`[Scraper] ✅ Google Shopping API bem-sucedida: ${bestResult.name}`);
        
        const productInfo: ScrapedProduct = {
          name: bestResult.name,
          price: bestResult.price || null,
          originalPrice: bestResult.originalPrice || null,
          imageUrl: bestResult.imageUrl,
          store: bestResult.store,
          description: bestResult.description,
          category: bestResult.category || 'Outros',
          brand: bestResult.brand
        };
        
        // Adiciona ao cache
        scrapingCache.set(cacheKey, productInfo, 60 * 60 * 1000); // 1 hora para dados de API
        
        // Adiciona ao histórico de preços
        if (productId && productInfo.price) {
          const oldEntries = priceHistoryService.getPriceHistory(productId);
          const lastPrice = oldEntries.length > 0 ? oldEntries[oldEntries.length - 1].price : null;
          
          priceHistoryService.addPriceEntry(productId, productInfo.price, 'google-api');
          
          if (lastPrice && lastPrice !== productInfo.price) {
            notificationService.checkPriceChange(productId, lastPrice, productInfo.price);
          }
        }
        
        return productInfo;
      }
    }
  } catch (error) {
    console.log(`[Scraper] Google Shopping API falhou: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }

  // ESTRATÉGIA 2: Tenta API específica da plataforma
  try {
    console.log(`[Scraper] Tentando API específica da plataforma...`);
    const apiResult = await tryAPIFirst(url);
    
    if (apiResult && apiResult.price > 0) {
      console.log(`[Scraper] ✅ API específica bem-sucedida: ${apiResult.name}`);
      
      const productInfo: ScrapedProduct = {
        name: apiResult.name,
        price: apiResult.price,
        originalPrice: apiResult.originalPrice || null,
        imageUrl: apiResult.imageUrl,
        store: apiResult.store,
        description: apiResult.description,
        category: apiResult.category || 'Outros',
        brand: apiResult.brand
      };
      
      // Adiciona ao cache
      scrapingCache.set(cacheKey, productInfo, 60 * 60 * 1000); // 1 hora para dados de API
      
      // Adiciona ao histórico de preços
      if (productId && productInfo.price) {
        const oldEntries = priceHistoryService.getPriceHistory(productId);
        const lastPrice = oldEntries.length > 0 ? oldEntries[oldEntries.length - 1].price : null;
        
        priceHistoryService.addPriceEntry(productId, productInfo.price, 'platform-api');
        
        if (lastPrice && lastPrice !== productInfo.price) {
          notificationService.checkPriceChange(productId, lastPrice, productInfo.price);
        }
      }
      
      return productInfo;
    }
  } catch (error) {
    console.log(`[Scraper] API específica falhou: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
  
  const errors: string[] = [];
  
  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!urlObj.protocol.startsWith('http')) {
      throw new Error('Invalid URL protocol');
    }

    // MÉTODO 1: Tenta scraping robusto com extractProductInfo
    try {
      console.log(`[Scraper] Tentando método padrão (extractProductInfo)`);
      const response = await robustFetch(url);
      const html = await response.text();
      
      if (html && html.length >= 100) {
        const productInfo = await extractProductInfo(url, html);
        
        // Valida se o resultado é válido (não é fallback genérico)
        const isValidResult = productInfo.name && 
                            !productInfo.name.includes('Produto extraído da URL') &&
                            (productInfo.price || productInfo.imageUrl);
        
        if (isValidResult) {
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
        } else {
          throw new Error('Resultado não contém dados válidos do produto');
        }
      }
      
      throw new Error('HTML muito pequeno ou vazio');
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
