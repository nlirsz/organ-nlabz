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

// Mercado Livre API (gratuita)
async function fetchFromMercadoLivreAPI(productId: string): Promise<APIProductResult | null> {
  try {
    const response = await fetch(`https://api.mercadolibre.com/items/${productId}`);
    if (!response.ok) return null;

    const data = await response.json();

    return {
      name: data.title,
      price: data.price,
      originalPrice: data.original_price,
      imageUrl: data.pictures?.[0]?.secure_url || data.thumbnail,
      store: 'Mercado Livre',
      description: data.descriptions?.[0]?.plain_text,
      category: data.category_id,
      brand: data.attributes?.find((attr: any) => attr.id === 'BRAND')?.value_name,
      url: data.permalink
    };
  } catch (error) {
    console.error('Erro ao buscar no Mercado Livre API:', error);
    return null;
  }
}

// Google Shopping API (com chave gratuita) - busca produtos por URL ou nome
async function fetchFromGoogleShopping(urlOrQuery: string): Promise<APIProductResult | null> {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const GOOGLE_CX = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  if (!GOOGLE_API_KEY || !GOOGLE_CX) return null;

  try {
    // Se é URL, extrai informações da URL para busca
    let searchQuery = urlOrQuery;
    if (urlOrQuery.startsWith('http')) {
      const urlObj = new URL(urlOrQuery);
      const domain = urlObj.hostname.replace('www.', '');
      const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 2);

      // Cria query baseada na URL
      searchQuery = `site:${domain} ${pathSegments.join(' ').replace(/[-_]/g, ' ')}`;
    }

    console.log(`[Google API] Buscando: ${searchQuery}`);

    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(searchQuery)}&num=3`
    );

    if (!response.ok) {
      console.log(`[Google API] Erro HTTP: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log(`[Google API] Nenhum resultado encontrado`);
      return null;
    }

    // Pega o primeiro resultado mais relevante
    const item = data.items[0];
    const itemUrl = item.link || item.formattedUrl;

    return {
      name: item.title?.replace(/[|\-].*$/, '').trim() || 'Produto encontrado',
      price: extractPriceFromSnippet(item.snippet) || 0,
      imageUrl: item.pagemap?.cse_image?.[0]?.src || 
                item.pagemap?.metatags?.[0]?.['og:image'] || 
                'https://via.placeholder.com/300x300/CCCCCC/666666?text=Produto',
      store: getStoreFromUrl(itemUrl),
      description: item.snippet || '',
      category: 'Outros',
      url: itemUrl,
      brand: extractBrandFromSnippet(item.snippet)
    };
  } catch (error) {
    console.error('[Google API] Erro ao buscar:', error);
    return null;
  }
}

// Helper para extrair preço do snippet
function extractPriceFromSnippet(snippet: string): number | null {
  if (!snippet) return null;

  // Regex para encontrar preços brasileiros
  const priceRegex = /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g;
  const matches = snippet.match(priceRegex);

  if (matches && matches.length > 0) {
    // Pega o primeiro preço encontrado
    const priceStr = matches[0].replace('R$', '').trim();
    return parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
  }

  return null;
}

// Helper para extrair marca do snippet
function extractBrandFromSnippet(snippet: string): string | undefined {
  const brands = ['Nike', 'Adidas', 'Zara', 'Samsung', 'Apple', 'Sony', 'LG'];
  for (const brand of brands) {
    if (snippet.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }
  return undefined;
}

// Helper para extrair nome da loja
function getStoreFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const storeMap: Record<string, string> = {
      'mercadolivre.com.br': 'Mercado Livre',
      'amazon.com.br': 'Amazon',
      'magazineluiza.com.br': 'Magazine Luiza',
      'americanas.com.br': 'Americanas',
      'zara.com': 'Zara',
      'nike.com.br': 'Nike'
    };

    for (const [domain, name] of Object.entries(storeMap)) {
      if (hostname.includes(domain)) return name;
    }

    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return 'Loja Online';
  }
}

// Extrai ID do produto de URLs conhecidas
function extractProductId(url: string): { platform: string; id: string } | null {
  const patterns = [
    // Mercado Livre - múltiplos formatos
    { platform: 'mercadolivre', regex: /mercadolivre\.com\.br\/.*?-([A-Z0-9-]+)(?:\?|$)/ },
    { platform: 'mercadolivre', regex: /produto\.mercadolivre\.com\.br\/([A-Z0-9-]+)/ },
    { platform: 'mercadolivre', regex: /articulo\.mercadolibre\.com\.[a-z]+\/.*?-([A-Z0-9-]+)(?:\?|$)/ },
    { platform: 'mercadolivre', regex: /\/p\/[A-Z0-9-]+\/([A-Z0-9-]+)/ },

    // Amazon - múltiplos formatos
    { platform: 'amazon', regex: /amazon\.com\.br\/.*\/dp\/([A-Z0-9]+)/ },
    { platform: 'amazon', regex: /amazon\.com\.br\/.*\/product\/([A-Z0-9]+)/ },
    { platform: 'amazon', regex: /amazon\.com\.br\/([A-Z0-9]+)\/dp\/([A-Z0-9]+)/ },

    // Shopee
    { platform: 'shopee', regex: /shopee\.com\.br\/.*?-i\.(\d+)\.(\d+)/ },

    // Magazine Luiza
    { platform: 'magazineluiza', regex: /magazineluiza\.com\.br\/.*\/([0-9]+)\/p/ }
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) {
      // Para Mercado Livre e Amazon, pega o ID principal
      const id = match[1] || match[2];
      if (id) {
        return { platform: pattern.platform, id };
      }
    }
  }

  return null;
}

export async function tryAPIFirst(url: string): Promise<APIProductResult | null> {
  console.log(`[API First] Tentando APIs para: ${url}`);

  // Primeiro tenta extrair ID específico da plataforma
  const productInfo = extractProductId(url);

  if (productInfo) {
    console.log(`[API First] ID encontrado: ${productInfo.platform} - ${productInfo.id}`);

    switch (productInfo.platform) {
      case 'mercadolivre':
        try {
          const result = await fetchFromMercadoLivreAPI(productInfo.id);
          if (result && result.price > 0) {
            console.log(`[API First] ✅ Mercado Livre API sucesso: ${result.name}`);
            return result;
          }
        } catch (error) {
          console.log(`[API First] Mercado Livre API falhou:`, error);
        }
        break;

      case 'amazon':
        // Amazon API requer aprovação - por enquanto usa Google como fallback
        console.log(`[API First] Amazon detectada, usando Google como fallback`);
        break;
    }
  }

  // Fallback: tenta Google Shopping para qualquer URL
  try {
    console.log(`[API First] Tentando Google Shopping API como fallback`);
    const googleResult = await fetchFromGoogleShopping(url);

    if (googleResult && (googleResult.price > 0 || googleResult.name !== 'Produto encontrado')) {
      console.log(`[API First] ✅ Google Shopping sucesso: ${googleResult.name}`);
      return googleResult;
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
    // Extrair termo de busca da URL
    const searchTerm = extractSearchTermFromUrl(url);
    console.log(`[API First] Termo de busca extraído: ${searchTerm}`);

    if (!searchTerm || searchTerm.length < 3) {
      console.log('[API First] Termo de busca muito curto, pulando APIs');
      return null;
    }

    // Tentar Mercado Livre primeiro
    try {
      const mlResults = await fetchFromMercadoLivre(searchTerm);
      if (mlResults && mlResults.length > 0) {
        console.log(`[API First] Mercado Livre encontrou ${mlResults.length} produtos`);
        results.push(...mlResults.slice(0, 3)); // Limitar a 3 resultados
      }
    } catch (error) {
      console.error('[API First] Erro no Mercado Livre:', error.message);
    }

    // Tentar Google Shopping
    try {
      const googleResults = await fetchFromGoogleShopping(searchTerm);
      if (googleResults && googleResults.length > 0) {
        console.log(`[API First] Google Shopping encontrou ${googleResults.length} produtos`);
        results.push(...googleResults.slice(0, 2)); // Limitar a 2 resultados
      }
    } catch (error) {
      console.error('[API First] Erro no Google Shopping:', error.message);
    }

    console.log(`[API First] Total de produtos encontrados: ${results.length}`);
    return results.length > 0 ? results : null;

  } catch (error) {
    console.error('[API First] Erro geral nas APIs:', error.message);
    return null;
  }
}

export { APIProductResult };