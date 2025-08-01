import axios from 'axios';
import { fetchAmazonProduct, searchAmazonProducts } from './amazon-api.js';
import { fetchShopeeProduct, isShopeeUrl, addShopeeAffiliateParams } from './shopee-api.js';

export interface APIProductResult {
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  store: string;
  description?: string;
  category?: string;
  brand?: string;
  url: string;
}

// Mercado Livre API (gratuita) - CORRIGIDA
async function fetchFromMercadoLivreAPI(productId: string): Promise<APIProductResult | null> {
  try {
    console.log(`[Mercado Livre API] Buscando produto ID: ${productId}`);

    const response = await fetch(`https://api.mercadolibre.com/items/${productId}`);
    if (!response.ok) {
      console.log(`[Mercado Livre API] Erro HTTP: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`[Mercado Livre API] Produto encontrado: ${data.title}`);

    // NOVA ESTRATÉGIA: Simula "copiar link da imagem" do navegador
    let imageUrl = 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Produto';

    if (data.pictures && data.pictures.length > 0) {
      // Prioriza secure_url (HTTPS), depois url
      const originalUrl = data.pictures[0].secure_url || data.pictures[0].url;

      if (originalUrl) {
        // ESTRATÉGIA: Mantém URL mais próxima do original (como copiar link funciona)
        imageUrl = originalUrl;

        // Remove parâmetros que podem causar problemas
        try {
          const urlObj = new URL(imageUrl);
          // Remove parâmetros de cache/tracking
          ['timestamp', 'cache', 'v', '_', 't'].forEach(param => {
            urlObj.searchParams.delete(param);
          });
          imageUrl = urlObj.toString();
        } catch (e) {
          // Se der erro no parse, mantém URL original
          console.warn('[ML API] Erro ao limpar URL, mantendo original:', e);
        }

        // Otimizações mínimas apenas para compatibilidade
        if (imageUrl.includes('.webp')) {
          // Cria fallback .jpg apenas como backup
          const jpgUrl = imageUrl.replace(/\.webp$/i, '.jpg');
          console.log(`[ML API] WebP detectado, criando fallback: ${imageUrl} → ${jpgUrl}`);
          imageUrl = jpgUrl;
        }

        // Melhora resolução apenas se for muito baixa
        if (imageUrl.includes('-I.jpg')) {
          imageUrl = imageUrl.replace(/-I\.jpg$/i, '-O.jpg');
          console.log(`[ML API] Melhorando resolução: -I.jpg → -O.jpg`);
        } else if (imageUrl.includes('-S.jpg')) {
          imageUrl = imageUrl.replace(/-S\.jpg$/i, '-O.jpg');
          console.log(`[ML API] Melhorando resolução: -S.jpg → -O.jpg`);
        }

        console.log(`[ML API] Imagem final: ${originalUrl} → ${imageUrl}`);
      }
    } else if (data.thumbnail) {
      // Aplica mesma lógica para thumbnail
      imageUrl = data.thumbnail;

      // Remove parâmetros problemáticos
      try {
        const urlObj = new URL(imageUrl);
        ['timestamp', 'cache', 'v', '_', 't'].forEach(param => {
          urlObj.searchParams.delete(param);
        });
        imageUrl = urlObj.toString();
      } catch (e) {
        console.warn('[ML API] Erro ao limpar thumbnail URL:', e);
      }

      // Otimizações mínimas
      if (imageUrl.includes('.webp')) {
        imageUrl = imageUrl.replace(/\.webp$/i, '.jpg');
      }

      if (imageUrl.includes('-I.jpg')) {
        imageUrl = imageUrl.replace(/-I\.jpg$/i, '-O.jpg');
      } else if (imageUrl.includes('-S.jpg')) {
        imageUrl = imageUrl.replace(/-S\.jpg$/i, '-O.jpg');
      }

      console.log(`[ML API] Thumbnail processada: ${data.thumbnail} → ${imageUrl}`);
    }

    // Normaliza preço
    const price = typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0;
    const originalPrice = data.original_price && typeof data.original_price === 'number' 
      ? data.original_price 
      : (data.original_price ? parseFloat(data.original_price) : undefined);

    // Busca descrição se disponível
    let description = '';
    try {
      if (data.descriptions && data.descriptions.length > 0) {
        description = data.descriptions[0].plain_text || '';
      }
    } catch (error) {
      console.log(`[Mercado Livre API] Erro ao buscar descrição:`, error);
    }

    // Extrai marca dos atributos
    let brand = '';
    if (data.attributes && Array.isArray(data.attributes)) {
      const brandAttr = data.attributes.find((attr: any) => attr.id === 'BRAND');
      brand = brandAttr?.value_name || '';
    }

    // Mapeia categoria
    const categoryMap: Record<string, string> = {
      'MLB1051': 'Eletrônicos',
      'MLB1430': 'Roupas',
      'MLB1367': 'Casa',
      'MLB1196': 'Livros',
      'MLB1144': 'Games',
      'MLB1132': 'Automotivo',
      'MLB1276': 'Esportes'
    };

    return {
      name: data.title || 'Produto Mercado Livre',
      price: price,
      originalPrice: originalPrice,
      imageUrl: imageUrl,
      store: 'Mercado Livre',
      description: description,
      category: categoryMap[data.category_id] || 'Outros',
      brand: brand,
      url: data.permalink || `https://produto.mercadolivre.com.br/${productId}`
    };
  } catch (error) {
    console.error('[Mercado Livre API] Erro ao buscar:', error);
    return null;
  }
}

// Busca por termo no Mercado Livre - NOVA FUNÇÃO
async function fetchFromMercadoLivre(searchTerm: string): Promise<APIProductResult[]> {
  try {
    console.log(`[Mercado Livre Search] Buscando: ${searchTerm}`);

    const encodedTerm = encodeURIComponent(searchTerm);
    const response = await fetch(`https://api.mercadolibre.com/sites/MLB/search?q=${encodedTerm}&limit=5`);

    if (!response.ok) {
      console.log(`[Mercado Livre Search] Erro HTTP: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log(`[Mercado Livre Search] Nenhum resultado encontrado`);
      return [];
    }

    const results: APIProductResult[] = [];

    for (const item of data.results.slice(0, 3)) {
      // ESTRATÉGIA: Link direto como copiar no navegador
      let imageUrl = 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Produto';

      if (item.thumbnail) {
        imageUrl = item.thumbnail;

        // Remove parâmetros que podem quebrar o link
        try {
          const urlObj = new URL(imageUrl);
          ['timestamp', 'cache', 'v', '_', 't', 'cb'].forEach(param => {
            urlObj.searchParams.delete(param);
          });
          imageUrl = urlObj.toString();
        } catch (e) {
          // Mantém original se der erro
          console.warn('[ML Search] Mantendo URL original devido a erro:', e);
        }

        // Apenas converte .webp para .jpg (melhor compatibilidade)
        if (imageUrl.includes('.webp')) {
          imageUrl = imageUrl.replace(/\.webp$/i, '.jpg');
        }

        // Melhora resolução apenas se muito baixa
        if (imageUrl.includes('-I.jpg')) {
          imageUrl = imageUrl.replace(/-I\.jpg$/i, '-O.jpg');
        } else if (imageUrl.includes('-S.jpg')) {
          imageUrl = imageUrl.replace(/-S\.jpg$/i, '-O.jpg');
        }

        console.log(`[ML Search] Link direto: ${item.thumbnail} → ${imageUrl}`);
      }

      // Normaliza preço
      const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;

      if (price > 0) {
        results.push({
          name: item.title || 'Produto Mercado Livre',
          price: price,
          imageUrl: imageUrl,
          store: 'Mercado Livre',
          description: item.condition === 'new' ? 'Produto novo' : 'Produto usado',
          category: 'Outros',
          url: item.permalink || `https://mercadolivre.com.br/p/${item.id}`
        });
      }
    }

    console.log(`[Mercado Livre Search] ${results.length} produtos válidos encontrados`);
    return results;
  } catch (error) {
    console.error('[Mercado Livre Search] Erro ao buscar:', error);
    return [];
  }
}

// Google Shopping API - CORRIGIDA com busca web normal
async function fetchFromGoogleShopping(urlOrQuery: string): Promise<APIProductResult[]> {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const GOOGLE_CX = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.log('[Google API] Chaves de API não configuradas');
    return [];
  }

  try {
    // Se é URL, extrai informações da URL para busca
    let searchQuery = urlOrQuery;
    if (urlOrQuery.startsWith('http')) {
      const urlObj = new URL(urlOrQuery);
      const domain = urlObj.hostname.replace('www.', '');

      // Para Mercado Livre, extrai nome do produto da URL
      if (domain.includes('mercadolivre.com')) {
        const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 2);
        // Remove /p/ e códigos do produto
        const productName = pathSegments
          .filter(s => !s.match(/^(p|MLB\d+)$/))
          .join(' ')
          .replace(/[-_]/g, ' ')
          .replace(/\d+gb/gi, '$& ')
          .trim();

        searchQuery = `"${productName}" site:${domain}`;
      } else {
        const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 2);
        searchQuery = `${pathSegments.join(' ').replace(/[-_]/g, ' ')} site:${domain}`;
      }
    }

    console.log(`[Google API] Buscando: ${searchQuery}`);

    // Remove searchType=image para busca web normal
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(searchQuery)}&num=5`
    );

    if (!response.ok) {
      console.log(`[Google API] Erro HTTP: ${response.status} - ${response.statusText}`);

      // Se der erro 400, tenta busca simplificada
      if (response.status === 400) {
        console.log(`[Google API] Tentando busca simplificada...`);
        const simpleQuery = urlOrQuery.startsWith('http') ? 
          extractSearchTermFromUrl(urlOrQuery) : 
          urlOrQuery.substring(0, 50); // Limita tamanho da query

        if (simpleQuery && simpleQuery.length > 3) {
          const simpleResponse = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(simpleQuery)}&num=3`
          );

          if (simpleResponse.ok) {
            const simpleData = await simpleResponse.json();
            return parseGoogleResults(simpleData);
          }
        }
      }

      return [];
    }

    const data = await response.json();
    return parseGoogleResults(data);

  } catch (error) {
    console.error('[Google API] Erro ao buscar:', error);
    return [];
  }
}

// Função auxiliar para processar resultados do Google
function parseGoogleResults(data: any): APIProductResult[] {
  if (!data.items || data.items.length === 0) {
    console.log(`[Google API] Nenhum resultado encontrado`);
    return [];
  }

  const results: APIProductResult[] = [];

  for (const item of data.items.slice(0, 3)) {
    const itemUrl = item.link || item.formattedUrl;

    // Busca melhor imagem
    let imageUrl = 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Produto';

    // Prioridades para imagem
    if (item.pagemap?.cse_image?.[0]?.src) {
      imageUrl = item.pagemap.cse_image[0].src;
    } else if (item.pagemap?.metatags?.[0]?.['og:image']) {
      imageUrl = item.pagemap.metatags[0]['og:image'];
    } else if (item.pagemap?.metatags?.[0]?.['twitter:image']) {
      imageUrl = item.pagemap.metatags[0]['twitter:image'];
    } else if (item.image?.contextLink) {
      imageUrl = item.image.contextLink;
    }

    // Extrai preço mais inteligentemente
    const price = extractPriceFromSnippet(item.snippet) || 
                 extractPriceFromMetatags(item.pagemap?.metatags?.[0]) || 
                 0;

    // Extrai marca
    const brand = extractBrandFromSnippet(item.snippet) || 
                 extractBrandFromMetatags(item.pagemap?.metatags?.[0]);

    const storeName = getStoreFromUrl(itemUrl);

    if (price > 0 || item.title) {
      results.push({
        name: item.title?.replace(/[|\-].*$/, '').trim() || 'Produto encontrado',
        price: price,
        imageUrl: imageUrl,
        store: storeName,
        description: item.snippet || '',
        category: guessCategory(item.title + ' ' + item.snippet),
        url: itemUrl,
        brand: brand
      });
    }
  }

  console.log(`[Google API] ${results.length} produtos válidos encontrados`);
  return results;
}

// Helper melhorado para extrair preço do snippet
function extractPriceFromSnippet(snippet: string): number | null {
  if (!snippet) return null;

  // Múltiplos padrões de preço brasileiro
  const pricePatterns = [
    /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g,
    /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*reais?/gi,
    /preço[:\s]+R?\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    /valor[:\s]+R?\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    /por[:\s]+R?\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi
  ];

  for (const pattern of pricePatterns) {
    const matches = snippet.match(pattern);
    if (matches && matches.length > 0) {
      // Pega o primeiro preço encontrado
      const priceStr = matches[0].replace(/[R$\s]/g, '').replace(/reais?/gi, '').trim();
      const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }
  }

  return null;
}

// Nova função para extrair preço de metatags
function extractPriceFromMetatags(metatags: any): number | null {
  if (!metatags) return null;

  const priceFields = [
    'product:price:amount',
    'og:price:amount',
    'twitter:label1',
    'twitter:data1'
  ];

  for (const field of priceFields) {
    const value = metatags[field];
    if (value && typeof value === 'string') {
      const price = parseFloat(value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.'));
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }
  }

  return null;
}

// Helper melhorado para extrair marca
function extractBrandFromSnippet(snippet: string): string | undefined {
  if (!snippet) return undefined;

  const brands = [
    'Nike', 'Adidas', 'Zara', 'Samsung', 'Apple', 'Sony', 'LG', 'Motorola',
    'Xiaomi', 'Huawei', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Microsoft',
    'Logitech', 'Razer', 'Corsair', 'Intel', 'AMD', 'Nvidia', 'Philips',
    'Brastemp', 'Electrolux', 'Consul', 'Fischer', 'Mondial', 'Britânia'
  ];

  const snippetLower = snippet.toLowerCase();

  for (const brand of brands) {
    if (snippetLower.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  return undefined;
}

// Nova função para extrair marca de metatags
function extractBrandFromMetatags(metatags: any): string | undefined {
  if (!metatags) return undefined;

  const brandFields = [
    'product:brand',
    'og:brand',
    'twitter:label2',
    'brand'
  ];

  for (const field of brandFields) {
    const value = metatags[field];
    if (value && typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

// Helper melhorado para categorias
function guessCategory(text: string): string {
  if (!text) return 'Outros';

  const textLower = text.toLowerCase();

  const categoryMap = [
    { keywords: ['celular', 'smartphone', 'tablet', 'notebook', 'computador', 'tv', 'televisão', 'eletrônico'], category: 'Eletrônicos' },
    { keywords: ['tênis', 'sapato', 'calçado', 'camisa', 'camiseta', 'calça', 'vestido', 'roupa', 'blusa'], category: 'Roupas' },
    { keywords: ['perfume', 'cosmético', 'beleza', 'creme', 'shampoo'], category: 'Outros' },
    { keywords: ['jogo', 'game', 'console', 'playstation', 'xbox', 'nintendo'], category: 'Games' },
    { keywords: ['livro', 'revista', 'ebook'], category: 'Livros' },
    { keywords: ['casa', 'decoração', 'móvel', 'cozinha', 'quarto'], category: 'Casa' },
    { keywords: ['esporte', 'fitness', 'academia', 'bicicleta'], category: 'Esportes' },
    { keywords: ['carro', 'auto', 'moto', 'pneu'], category: 'Automotivo' }
  ];

  for (const { keywords, category } of categoryMap) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      return category;
    }
  }

  return 'Outros';
}

// Helper para extrair nome da loja - MELHORADO
function getStoreFromUrl(url: string): string {
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
      'zara.com': 'Zara',
      'nike.com.br': 'Nike Brasil',
      'netshoes.com.br': 'Netshoes',
      'dafiti.com.br': 'Dafiti',
      'shopee.com.br': 'Shopee',
      'aliexpress.com': 'AliExpress',
      'kabum.com.br': 'KaBuM',
      'pichau.com.br': 'Pichau'
    };

    for (const [domain, name] of Object.entries(storeMap)) {
      if (hostname.includes(domain)) return name;
    }

    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return 'Loja Online';
  }
}

// Extrai termo de busca da URL - NOVA FUNÇÃO
function extractSearchTermFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const domain = urlObj.hostname;

    // Remove prefixos comuns e divide por separadores
    const cleanPath = pathname.replace(/^\/(pt|br|en)\//, '').replace(/\.[^/.]+$/, '');
    const segments = cleanPath.split(/[\/\-_]/).filter(s => s.length > 2);

    // Remove palavras não descritivas
    const stopWords = ['produto', 'item', 'p', 'products', 'pd', 'buy', 'shop'];
    const descriptiveSegments = segments.filter(s => 
      !stopWords.includes(s.toLowerCase()) && 
      !/^\d+$/.test(s) // Remove números puros
    );

    if (descriptiveSegments.length > 0) {
      return descriptiveSegments.slice(0, 5).join(' ');
    }

    return '';
  } catch {
    return '';
  }
}

// Extrai ID do produto de URLs conhecidas - CORRIGIDO
function extractProductId(url: string): { platform: string; id: string } | null {
  const patterns = [
    // Mercado Livre - CORRIGIDO para capturar IDs corretamente
    { platform: 'mercadolivre', regex: /\/p\/([A-Z0-9]+)/i }, // Para URLs /p/MLB47769283
    { platform: 'mercadolivre', regex: /mercadolivre\.com\.br\/.*?-(MLB[A-Z0-9]+)(?:[_\-]|(?:\?|$|#))/i },
    { platform: 'mercadolivre', regex: /produto\.mercadolivre\.com\.br\/(MLB[A-Z0-9]+)/i },
    { platform: 'mercadolivre', regex: /articulo\.mercadolibre\.com\.[a-z]+\/.*?-(ML[A-Z0-9]+)(?:[_\-]|(?:\?|$))/i },

    // Amazon - múltiplos formatos
    { platform: 'amazon', regex: /amazon\.com\.br\/.*\/dp\/([A-Z0-9]{10})/i },
    { platform: 'amazon', regex: /amazon\.com\.br\/.*\/product\/([A-Z0-9]{10})/i },
    { platform: 'amazon', regex: /amazon\.com\.br\/dp\/([A-Z0-9]{10})/i },
    { platform: 'amazon', regex: /amazon\.com\.br\/gp\/product\/([A-Z0-9]{10})/i },

    // Shopee - ATUALIZADO
    { platform: 'shopee', regex: /shopee\.com\.br\/.*?-i\.(\d+)\.(\d+)/i },
    { platform: 'shopee', regex: /shopee\.com\.br\/.*?\.(\d+)\.(\d+)/i },
    { platform: 'shopee', regex: /product\/(\d+)\/(\d+)/i },

    // Magazine Luiza
    { platform: 'magazineluiza', regex: /magazineluiza\.com\.br\/.*\/([0-9]+)\/p/i }
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) {
      const id = match[1] || match[2];
      if (id && id.length >= 3) { // Reduzido para capturar IDs menores válidos do ML
        console.log(`[Product ID] Extraído ${pattern.platform}: ${id}`);
        return { platform: pattern.platform, id };
      }
    }
  }

  return null;
}

export async function tryAPIFirst(url: string): Promise<APIProductResult | null> {
  console.log(`[API First] Tentando APIs para: ${url}`);

  // NOVA REGRA: Para Shopee, SEMPRE usa catálogo/banco primeiro
  if (isShopeeUrl(url)) {
    try {
      console.log(`[API First] 🛍️ URL da Shopee detectada - priorizando catálogo...`);
      const result = await fetchShopeeProduct(url);
      if (result) {
        console.log(`[API First] ✅ Shopee catálogo sucesso: ${result.name}`);
        return result;
      }
    } catch (error) {
      console.log(`[API First] ⚠️ Shopee catálogo falhou, continuará com scraping:`, error);
      return null; // Retorna null para continuar com scraping normal
    }
  }

  // Para OUTRAS LOJAS: Usa scraping normal SEM tentar APIs primeiro
  console.log(`[API First] 🌐 Não é Shopee - usando scraping tradicional`);
  return null;

  // Primeiro tenta extrair ID específico da plataforma
  const productInfo = extractProductId(url);

  if (productInfo) {
    console.log(`[API First] ID encontrado: ${productInfo.platform} - ${productInfo.id}`);

    switch (productInfo.platform) {
      case 'mercadolivre':
        try {
          const result = await fetchFromMercadoLivreAPI(productInfo.id);
          if (result && (result.price > 0 || result.name !== 'Produto Mercado Livre')) {
            console.log(`[API First] ✅ Mercado Livre API sucesso: ${result.name}`);
            return result;
          }
        } catch (error) {
          console.log(`[API First] Mercado Livre API falhou:`, error);
        }
        break;

      case 'shopee':
        try {
          const result = await fetchShopeeProduct(url);
          if (result) {
            console.log(`[API First] ✅ Shopee processado: ${result.name}`);
            return result;
          }
        } catch (error) {
          console.log(`[API First] Shopee processing falhou:`, error);
        }
        break;

      case 'amazon':
        try {
          const result = await fetchAmazonProduct(url);
          if (result) {
            console.log(`[API First] ✅ Amazon processado: ${result.name}`);
            return result;
          }
        } catch (error) {
          console.log(`[API First] Amazon processing falhou:`, error);
        }
        break;
    }
  }

  // Fallback: tenta Google Shopping para qualquer URL
  try {
    console.log(`[API First] Tentando Google Shopping API como fallback`);
    const googleResults = await fetchFromGoogleShopping(url);

    if (googleResults && googleResults.length > 0) {
      const bestResult = googleResults[0];
      if (bestResult && (bestResult.price > 0 || bestResult.name !== 'Produto encontrado')) {
        console.log(`[API First] ✅ Google Shopping sucesso: ${bestResult.name}`);
        return bestResult;
      }
    }
  } catch (error) {
    console.log(`[API First] Google Shopping falhou:`, error);
  }

  console.log(`[API First] Todas as APIs falharam para: ${url}`);
  return null;
}

export async function fetchProductFromAPIs(url: string): Promise<APIProductResult[] | null> {
  console.log(`[API First] Buscando produto via APIs para: ${url}`);

  const results: APIProductResult[] = [];

  try {
    // NOVA LÓGICA: Para Shopee, tenta catálogo primeiro
    if (isShopeeUrl(url)) {
      console.log(`[API First] 🛍️ Shopee detectada - buscando no catálogo...`);
      const shopeeResult = await tryAPIFirst(url);
      if (shopeeResult) {
        console.log(`[API First] ✅ Shopee catálogo bem-sucedido`);
        return [shopeeResult];
      }
      console.log(`[API First] ⚠️ Catálogo Shopee falhou - voltando para scraping`);
      return null;
    }

    // Para OUTRAS LOJAS: Não usa APIs, vai direto para scraping
    console.log(`[API First] 🌐 Não é Shopee - pulando APIs, usando scraping`);
    return null;

    // PRIORIDADE 2: Google Shopping como principal (mais confiável)
    try {
      console.log(`[API First] Tentando Google Shopping como prioridade...`);
      const googleResults = await fetchFromGoogleShopping(url);
      if (googleResults && googleResults.length > 0) {
        const validResults = googleResults.filter(r => r.price > 0 || r.name !== 'Produto encontrado');
        if (validResults.length > 0) {
          console.log(`[API First] ✅ Google Shopping encontrou ${validResults.length} produtos válidos`);
          results.push(...validResults.slice(0, 3));
        }
      }
    } catch (error) {
      console.error('[API First] Erro no Google Shopping:', error);
    }

    // PRIORIDADE 3: Mercado Livre como complemento
    const searchTerm = extractSearchTermFromUrl(url);
    if (searchTerm && searchTerm.length >= 3 && url.includes('mercadolivre.com')) {
      try {
        const mlResults = await fetchFromMercadoLivre(searchTerm);
        if (mlResults && mlResults.length > 0) {
          console.log(`[API First] Mercado Livre encontrou ${mlResults.length} produtos`);
          // Adiciona apenas se não temos resultados suficientes do Google
          if (results.length < 2) {
            results.push(...mlResults.slice(0, 2));
          }
        }
      } catch (error) {
        console.error('[API First] Erro no Mercado Livre:', error);
      }
    }

     // PRIORIDADE 4: Amazon como complemento
     if (searchTerm && searchTerm.length >= 3 && url.includes('amazon.com')) {
      try {
        const amazonResults = await searchAmazonProducts(searchTerm);
        if (amazonResults && amazonResults.length > 0) {
          console.log(`[API First] Amazon encontrou ${amazonResults.length} produtos`);
          // Adiciona apenas se não temos resultados suficientes do Google e ML
          if (results.length < 2) {
            results.push(...amazonResults.slice(0, 2));
          }
        }
      } catch (error) {
        console.error('[API First] Erro no Amazon:', error);
      }
    }

    console.log(`[API First] Total de produtos encontrados: ${results.length}`);
    return results.length > 0 ? results : null;

  } catch (error) {
    console.error('[API First] Erro geral nas APIs:', error);
    return null;
  }
}

export { fetchFromGoogleShopping, APIProductResult };